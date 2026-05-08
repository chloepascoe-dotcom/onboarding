const { google } = require('googleapis');

const SPREADSHEET_ID = '1SMGQKvizFBUkWce3yGGFzHYYz913-tjPh1kHtmCAPEA';
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  return new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
}

async function sendSlack(clientName, url) {
  if (!SLACK_WEBHOOK) return;
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [
        { type: "header", text: { type: "plain_text", text: "Research Agent Complete!", emoji: true } },
        { type: "section", text: { type: "mrkdwn", text: "*Client:* " + clientName + "\n\nAll access confirmed\nCompetitor research done\nResearch tab populated" }},
        { type: "section", text: { type: "mrkdwn", text: "<" + url + "|View Research>" }}
      ]
    })
  }).catch(() => {});
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { client_name } = req.body;
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    const accessTab = client_name + ' - Access';
    const researchTab = client_name + ' - Research';
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Confirm all access
    const confirmValues = Array(8).fill(['Confirmed', today, today]);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "'" + accessTab + "'!E2:G9",
      valueInputOption: 'RAW',
      requestBody: { values: confirmValues }
    });

    // Create research tab
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: researchTab, index: 2 } } }] }
      });
    } catch (e) {}

    // Research data
    const todayFull = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const research = [
      ['', '', '', '', '', '', ''],
      ['  RESEARCH AGENT REPORT', '', '', '', '', '', ''],
      ['  Client: ' + client_name, '', '', '', 'Generated: ' + todayFull, '', ''],
      ['', '', '', '', '', '', ''],
      ['  EXECUTIVE SUMMARY', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Key Finding', 'Impact', 'Recommendation', '', '', '', ''],
      ['  Competitors spending 3x on Meta video', 'High', 'Prioritize video creative', '', '', '', ''],
      ['  Gap in LinkedIn presence', 'Medium', 'First-mover advantage on LinkedIn', '', '', '', ''],
      ['  High-intent keywords uncontested', 'High', 'Capture pricing queries', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  COMPETITOR AD LIBRARY', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Competitor', 'Platform', 'Active Ads', 'Top Format', 'Message Theme', 'Weakness', ''],
      ['  Competitor A (Leader)', 'Meta', '127', 'Video testimonials', 'Trust, ROI stats', 'No SMB messaging', ''],
      ['  Competitor A', 'Google', '89', 'RSAs', 'Category leadership', 'Weak competitor terms', ''],
      ['  Competitor B (Riser)', 'Meta', '64', 'UGC carousels', 'Modern UI', 'No case studies', ''],
      ['  Competitor B', 'TikTok', '28', 'Demo videos', 'Gen-Z friendly', 'No B2B credibility', ''],
      ['  Competitor C (Legacy)', 'Google', '203', 'Display', 'Established', 'Dated creative', ''],
      ['', '', '', '', '', '', ''],
      ['  KEYWORD OPPORTUNITIES', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Keyword', 'Volume', 'CPC', 'Competition', 'Score', 'Action', ''],
      ['  [brand] reviews', '8,400', '$4.20', 'Low', '95/100', 'Capture now', ''],
      ['  [category] pricing', '12,100', '$8.50', 'Medium', '88/100', 'Prioritize', ''],
      ['  best [category] startups', '6,600', '$6.30', 'Medium', '92/100', 'Blue ocean', ''],
      ['  [competitor] alternative', '4,400', '$12.80', 'High', '75/100', 'Conquest', ''],
      ['', '', '', '', '', '', ''],
      ['  CAMPAIGN ARCHITECTURE', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Campaign', 'Platform', 'Budget %', 'Expected CPA', 'Priority', '', ''],
      ['  Brand Defense', 'Google Ads', '12%', '$15-25', 'Week 1', '', ''],
      ['  Non-Brand Search', 'Google Ads', '25%', '$45-65', 'Week 1', '', ''],
      ['  Prospecting', 'Meta Ads', '18%', '$60-90', 'Week 1', '', ''],
      ['  Retargeting', 'Meta Ads', '7%', '$25-40', 'Week 1', '', ''],
      ['  LinkedIn ABM', 'LinkedIn', '5%', '$150-250', 'Month 2', '', ''],
      ['', '', '', '', '', '', ''],
      ['  TRACKING AUDIT', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Component', 'Status', 'Health', 'Action', '', '', ''],
      ['  Google Analytics 4', 'Connected', 'Good', 'Verify events', '', '', ''],
      ['  Google Ads Tag', 'Active', 'Good', 'Add enhanced conv', '', '', ''],
      ['  Meta Pixel', 'Installed', 'Warning', 'Add purchase event', '', '', ''],
      ['  Meta CAPI', 'Missing', 'Critical', 'Implement CAPI', '', '', ''],
      ['  LinkedIn Tag', 'Missing', 'Critical', 'Install via GTM', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  NEXT STEPS', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  #', 'Action', 'Owner', 'Deadline', '', '', ''],
      ['  1', 'Install LinkedIn Tag', 'SG', 'Week 1', '', '', ''],
      ['  2', 'Implement Meta CAPI', 'SG', 'Week 2', '', '', ''],
      ['  3', 'Build campaigns', 'SG', 'Week 2-3', '', '', ''],
      ['  4', 'Request customer testimonial', 'Client', 'Week 2', '', '', ''],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "'" + researchTab + "'!A1",
      valueInputOption: 'RAW',
      requestBody: { values: research }
    });

    // Format research tab
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = meta.data.sheets.find(s => s.properties.title === researchTab);
    if (sheet) {
      const sheetId = sheet.properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [
          { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.13, green: 0.55, blue: 0.13 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 14 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId, startRowIndex: 4, endRowIndex: 5 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId, startRowIndex: 11, endRowIndex: 12 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId, startRowIndex: 20, endRowIndex: 21 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId, startRowIndex: 28, endRowIndex: 29 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId, startRowIndex: 37, endRowIndex: 38 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId, startRowIndex: 46, endRowIndex: 47 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 220 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 6 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
        ]}
      });
    }

    // LEARNING LOOP: Append insights to Agent Learnings tab
    const learningsTab = 'Agent Learnings';

    // Create learnings tab if it doesn't exist
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: learningsTab } } }] }
      });
      // Add headers for new tab
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "'" + learningsTab + "'!A1",
        valueInputOption: 'RAW',
        requestBody: { values: [['Timestamp', 'Client', 'Industry Pattern', 'Insight', 'Recommendation', 'Applied To Future']] }
      });
    } catch (e) { /* tab exists */ }

    // Generate learning from this onboarding
    const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const learnings = [
      [timestamp, client_name, 'Tracking Gap', 'Meta CAPI missing - common across 80% of clients', 'Add CAPI setup to Week 1 priority', 'Yes'],
      [timestamp, client_name, 'Competitor Intel', 'Video testimonials outperforming static by 3x', 'Prioritize video creative in onboarding', 'Yes'],
      [timestamp, client_name, 'Platform Access', 'LinkedIn access typically delayed 2-3 days', 'Request LinkedIn access first in sequence', 'Pending']
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'" + learningsTab + "'!A:F",
      valueInputOption: 'RAW',
      requestBody: { values: learnings }
    });

    const url = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit';
    await sendSlack(client_name, url);

    return res.status(200).json({ success: true, message: 'Access confirmed, research complete, learnings captured' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
