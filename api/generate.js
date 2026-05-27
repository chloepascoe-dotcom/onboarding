// Dashboard API endpoint - transforms dashboard input to HubSpot format and calls hubspot-webhook
// Handles file uploads for supplementary documents (SOW, decks, proposals)
const hubspotHandler = require('./hubspot-webhook');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

// File parsers
let pdfParse, mammoth, XLSX;
try {
  pdfParse = require('pdf-parse');
  mammoth = require('mammoth');
  XLSX = require('xlsx');
} catch (e) {
  console.log('File parsing libraries not fully loaded:', e.message);
}

// Disable body parsing for this route (needed for formidable)
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

// Parse multipart form data
async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      maxFiles: 5,
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// Extract text from uploaded file
async function extractFileText(file) {
  const filepath = file.filepath || file.path;
  const filename = file.originalFilename || file.name || 'unknown';
  const ext = path.extname(filename).toLowerCase();

  try {
    const buffer = fs.readFileSync(filepath);

    switch (ext) {
      case '.pdf':
        if (pdfParse) {
          const pdfData = await pdfParse(buffer);
          return { filename, text: pdfData.text, type: 'PDF' };
        }
        break;

      case '.docx':
      case '.doc':
        if (mammoth) {
          const result = await mammoth.extractRawText({ buffer });
          return { filename, text: result.value, type: 'Word Document' };
        }
        break;

      case '.xlsx':
      case '.xls':
        if (XLSX) {
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          let text = '';
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            text += `--- ${sheetName} ---\n`;
            text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
          }
          return { filename, text, type: 'Excel Spreadsheet' };
        }
        break;

      case '.pptx':
      case '.ppt':
        // For PowerPoint, we'd need a different library
        // For now, return a note that we received it
        return { filename, text: '[PowerPoint file received - manual review recommended]', type: 'PowerPoint' };

      default:
        // Try to read as plain text
        return { filename, text: buffer.toString('utf8').slice(0, 50000), type: 'Text' };
    }
  } catch (e) {
    console.error(`Error parsing file ${filename}:`, e.message);
    return { filename, text: `[Error reading file: ${e.message}]`, type: 'Error' };
  }

  return { filename, text: '[File type not supported for text extraction]', type: 'Unknown' };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const { fields, files } = await parseForm(req);

    console.log('Received form fields:', Object.keys(fields));
    console.log('Received files:', files.files ? (Array.isArray(files.files) ? files.files.length : 1) : 0);

    // Extract field values (formidable v3 returns arrays)
    const getValue = (field) => Array.isArray(field) ? field[0] : field;

    const clientName = getValue(fields.client_name);
    const industry = getValue(fields.industry);
    const monthlyBudget = getValue(fields.monthly_budget);
    const kickoffDate = getValue(fields.kickoff_date);
    const assignedOwner = getValue(fields.assigned_owner);
    const contactEmail = getValue(fields.contact_email);

    // Parse services array
    let services;
    try {
      services = JSON.parse(getValue(fields.services));
    } catch (e) {
      services = ['paid_media'];
    }

    // Process uploaded files
    let supplementaryContent = '';
    const uploadedFiles = files.files || [];
    const fileArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];

    if (fileArray.length > 0 && fileArray[0]) {
      console.log(`Processing ${fileArray.length} uploaded files...`);

      const extractedDocs = [];
      for (const file of fileArray) {
        if (file && file.filepath) {
          const extracted = await extractFileText(file);
          extractedDocs.push(extracted);
          console.log(`Extracted ${extracted.text.length} chars from ${extracted.filename} (${extracted.type})`);
        }
      }

      if (extractedDocs.length > 0) {
        supplementaryContent = extractedDocs.map(doc =>
          `=== ${doc.filename} (${doc.type}) ===\n${doc.text}`
        ).join('\n\n');
      }
    }

    // Transform dashboard format to HubSpot-like format
    const transformedBody = {
      properties: {
        dealname: clientName,
        amount: monthlyBudget,
        industry: industry || '',
        services: Array.isArray(services) ? services.join(', ') : (services || 'paid_media'),
        hubspot_owner_id: assignedOwner || 'default',
        closedate: kickoffDate || new Date().toISOString()
      },
      // Include supplementary content for roadmap customization
      supplementary_documents: supplementaryContent || null
    };

    console.log('Transformed body:', JSON.stringify({
      ...transformedBody,
      supplementary_documents: supplementaryContent ? `[${supplementaryContent.length} chars]` : null
    }));

    // Create mock request with transformed body
    const mockReq = {
      method: 'POST',
      body: transformedBody,
      headers: { 'content-type': 'application/json' }
    };

    // Pass through to hubspot-webhook handler
    return await hubspotHandler(mockReq, res);

  } catch (err) {
    console.error('Generate API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
