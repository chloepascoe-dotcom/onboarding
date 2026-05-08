const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1SMGQKvizFBUkWce3yGGFzHYYz913-tjPh1kHtmCAPEA';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Mock sales data - change this for different demos
const SALES_DATA = {
  client_name: "TechFlow Industries",
  services: ["paid_media"],
  monthly_budget: 75000,
  kickoff_date: "2026-05-15",
  industry: "B2B SaaS",
  assigned_owner: "Chloe Pascoe"
};

// Calculate actual week dates from kickoff
function getWeekDates(kickoffDate) {
  const dates = [];
  const start = new Date(kickoffDate);
  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + (i * 7));
    dates.push(weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return dates;
}

async function populateSheet() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const weekDates = getWeekDates(SALES_DATA.kickoff_date);
  const owner = SALES_DATA.assigned_owner;

  console.log(`\n🚀 Populating Gantt chart for: ${SALES_DATA.client_name}`);
  console.log(`   Kickoff: ${SALES_DATA.kickoff_date}`);
  console.log(`   Owner: ${owner}\n`);

  // Build data using YOUR exact template structure
  const ganttData = [
    // Header row with actual dates
    ['Category', 'Task', 'Owner', 'Assigned To',
     `W1\n${weekDates[0]}`, `W2\n${weekDates[1]}`, `W3\n${weekDates[2]}`, `W4\n${weekDates[3]}`,
     `W5\n${weekDates[4]}`, `W6\n${weekDates[5]}`, `W7\n${weekDates[6]}`, `W8\n${weekDates[7]}`,
     `W9\n${weekDates[8]}`, `W10\n${weekDates[9]}`, `W11\n${weekDates[10]}`, `W12\n${weekDates[11]}`],

    // Client info header
    [`CLIENT: ${SALES_DATA.client_name}`, `Budget: $${SALES_DATA.monthly_budget.toLocaleString()}/mo`, SALES_DATA.industry, owner, '', '', '', '', '', '', '', '', '', '', '', ''],

    // ACCESS & SETUP
    ['ACCESS & SETUP', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Request platform access (Google, Meta, LinkedIn, etc.)', 'SG', owner, 'X', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Client grants access to all platforms', 'Client', 'Client', 'X', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Verify all access confirmed', 'SG', owner, '', 'X', '', '', '', '', '', '', '', '', '', ''],
    ['', 'CRM access setup & validation', 'Both', 'Both', 'X', 'X', '', '', '', '', '', '', '', '', '', ''],

    // TRACKING & ANALYTICS
    ['TRACKING & ANALYTICS', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Audit existing tracking setup', 'SG', owner, 'X', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Create tracking implementation plan', 'SG', owner, 'X', 'X', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Implement/update GTM container', 'SG', owner, '', 'X', 'X', '', '', '', '', '', '', '', '', ''],
    ['', 'Set up conversion actions (Google, Meta, etc.)', 'SG', owner, '', 'X', 'X', '', '', '', '', '', '', '', '', ''],
    ['', 'Configure offline conversion import (if CRM)', 'SG', owner, '', '', 'X', 'X', '', '', '', '', '', '', '', ''],
    ['', 'Validate all tracking fires correctly', 'SG', owner, '', '', 'X', '', '', '', '', '', '', '', '', ''],

    // STRATEGY & PLANNING
    ['STRATEGY & PLANNING', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Kickoff call', 'Both', 'Both', 'M', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Historical performance analysis', 'SG', owner, 'X', 'X', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Competitor research & ad library review', 'SG', owner, 'X', 'X', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Define KPIs, targets, and success metrics', 'Both', 'Both', '', 'X', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Develop campaign strategy & structure', 'SG', owner, '', 'X', 'X', '', '', '', '', '', '', '', '', ''],
    ['', 'Strategy presentation & approval', 'Both', 'Both', '', '', 'M', '', '', '', '', '', '', '', '', ''],

    // CAMPAIGN BUILD
    ['CAMPAIGN BUILD', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Create campaign naming conventions', 'SG', owner, '', 'X', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Build campaign structure (Google)', 'SG', owner, '', '', 'X', 'X', '', '', '', '', '', '', '', ''],
    ['', 'Build campaign structure (Meta)', 'SG', owner, '', '', 'X', 'X', '', '', '', '', '', '', '', ''],
    ['', 'Build campaign structure (LinkedIn/Other)', 'SG', owner, '', '', '', 'X', 'X', '', '', '', '', '', '', ''],
    ['', 'Write ad copy (all platforms)', 'SG', owner, '', '', 'X', 'X', '', '', '', '', '', '', '', ''],
    ['', 'Request creative assets from Creative team', 'SG', owner, '', '', 'X', '', '', '', '', '', '', '', '', ''],
    ['', 'Upload creatives and finalize ads', 'SG', owner, '', '', '', 'X', '', '', '', '', '', '', '', ''],
    ['', 'QA all campaigns before launch', 'SG', owner, '', '', '', 'X', '', '', '', '', '', '', '', ''],

    // LAUNCH & OPTIMIZATION
    ['LAUNCH & OPTIMIZATION', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Pre-launch checklist complete', 'SG', owner, '', '', '', 'M', '', '', '', '', '', '', '', ''],
    ['', 'Launch campaigns', 'SG', owner, '', '', '', '', 'M', '', '', '', '', '', '', ''],
    ['', 'Day 1-3 monitoring & adjustments', 'SG', owner, '', '', '', '', 'X', '', '', '', '', '', '', ''],
    ['', 'Week 1 performance review', 'Both', 'Both', '', '', '', '', '', 'X', '', '', '', '', '', ''],
    ['', 'Ongoing optimization (bids, budgets, audiences)', 'SG', owner, '', '', '', '', '', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
    ['', 'A/B testing (copy, creative, audiences)', 'SG', owner, '', '', '', '', '', '', 'X', 'X', 'X', 'X', 'X', 'X'],

    // REPORTING & COMMUNICATION
    ['REPORTING & COMMUNICATION', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Set up reporting dashboard', 'SG', owner, '', '', 'X', 'X', '', '', '', '', '', '', '', ''],
    ['', 'Weekly status calls', 'Both', 'Both', '', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'],
    ['', 'Month 1 performance report', 'SG', owner, '', '', '', 'M', '', '', '', '', '', '', '', ''],
    ['', 'Month 2 performance report', 'SG', owner, '', '', '', '', '', '', '', 'M', '', '', '', ''],
    ['', '90-day review & strategy refresh', 'Both', 'Both', '', '', '', '', '', '', '', '', '', '', '', 'M'],
  ];

  // Clear and write Gantt Chart
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Gaant Chart'!A:Z"
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Gaant Chart'!A1",
    valueInputOption: 'RAW',
    requestBody: { values: ganttData }
  });
  console.log('✅ Gantt Chart populated');

  // Get sheet metadata for formatting
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });

  // Populate Access Checklist tab
  const accessData = [
    ['Platform', 'Status', 'Owner', 'Access Type', 'Notes'],
    ['Google Ads', 'Pending', owner, 'Admin', ''],
    ['Meta Business Manager', 'Pending', owner, 'Admin', ''],
    ['Meta Ads Manager', 'Pending', owner, 'Advertiser', ''],
    ['Google Analytics 4', 'Pending', owner, 'Editor', ''],
    ['Google Tag Manager', 'Pending', owner, 'Publish', ''],
    ['Google Search Console', 'Pending', owner, 'Full', ''],
    ['LinkedIn Ads', 'Pending', owner, 'Account Manager', ''],
    ['Microsoft/Bing Ads', 'Pending', owner, 'Standard User', ''],
    ['CRM Access', 'Pending', owner, 'View + Export', ''],
    ['Reporting Dashboard', 'Pending', owner, 'Viewer', ''],
    ['Client Website CMS', 'Pending', owner, 'As needed', ''],
    ['Slack Channel', 'Pending', owner, 'Member', ''],
  ];

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Access Checklist'!A:Z"
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Access Checklist'!A1",
      valueInputOption: 'RAW',
      requestBody: { values: accessData }
    });
    console.log('✅ Access Checklist populated');

    // Format Access Checklist
    const accessSheet = sheetMeta.data.sheets.find(s => s.properties.title === 'Access Checklist');
    if (accessSheet) {
      const accessSheetId = accessSheet.properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            // Header row formatting
            {
              repeatCell: {
                range: { sheetId: accessSheetId, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
              }
            },
            // Column widths
            { updateDimensionProperties: { range: { sheetId: accessSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
            { updateDimensionProperties: { range: { sheetId: accessSheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 100 }, fields: 'pixelSize' } },
            { updateDimensionProperties: { range: { sheetId: accessSheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } },
            { updateDimensionProperties: { range: { sheetId: accessSheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
            { updateDimensionProperties: { range: { sheetId: accessSheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } },
            // Freeze header
            {
              updateSheetProperties: {
                properties: { sheetId: accessSheetId, gridProperties: { frozenRowCount: 1 } },
                fields: 'gridProperties.frozenRowCount'
              }
            },
            // Borders
            {
              updateBorders: {
                range: { sheetId: accessSheetId, startRowIndex: 0, endRowIndex: 13, startColumnIndex: 0, endColumnIndex: 5 },
                top: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                bottom: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                left: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                right: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                innerHorizontal: { style: 'SOLID', color: { red: 0.9, green: 0.9, blue: 0.9 } },
                innerVertical: { style: 'SOLID', color: { red: 0.9, green: 0.9, blue: 0.9 } }
              }
            },
            // Add data validation dropdown for Status column
            {
              setDataValidation: {
                range: { sheetId: accessSheetId, startRowIndex: 1, endRowIndex: 13, startColumnIndex: 1, endColumnIndex: 2 },
                rule: {
                  condition: { type: 'ONE_OF_LIST', values: [{ userEnteredValue: 'Pending' }, { userEnteredValue: 'Requested' }, { userEnteredValue: 'Granted' }, { userEnteredValue: 'N/A' }] },
                  showCustomUi: true,
                  strict: true
                }
              }
            }
          ]
        }
      });
      console.log('✅ Access Checklist formatted');
    }
  } catch (e) {
    console.log('⚠️  Access Checklist tab not found - skipping');
  }

  // Get Gantt sheet ID for formatting
  const ganttSheet = sheetMeta.data.sheets.find(s => s.properties.title === 'Gaant Chart');
  const sheetId = ganttSheet.properties.sheetId;

  // Apply formatting
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        // Freeze header row
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount'
          }
        },
        // Header row - dark blue background, white text, bold
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
          }
        },
        // Client info row - light blue background
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.85, green: 0.92, blue: 1 },
                textFormat: { bold: true, fontSize: 11 }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        },
        // Category rows - gray background, bold (rows 3, 8, 15, 23, 34, 43)
        ...[2, 7, 14, 22, 33, 42].map(row => ({
          repeatCell: {
            range: { sheetId, startRowIndex: row, endRowIndex: row + 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                textFormat: { bold: true, fontSize: 10 }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        })),
        // Column widths
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 320 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 70 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 16 }, properties: { pixelSize: 65 }, fields: 'pixelSize' } },
        // Center align week columns
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, startColumnIndex: 4, endColumnIndex: 16 },
            cell: {
              userEnteredFormat: { horizontalAlignment: 'CENTER' }
            },
            fields: 'userEnteredFormat(horizontalAlignment)'
          }
        },
        // Row height for header
        { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 45 }, fields: 'pixelSize' } },
        // Add borders
        {
          updateBorders: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 50, startColumnIndex: 0, endColumnIndex: 16 },
            top: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            bottom: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            left: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            right: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            innerHorizontal: { style: 'SOLID', color: { red: 0.9, green: 0.9, blue: 0.9 } },
            innerVertical: { style: 'SOLID', color: { red: 0.9, green: 0.9, blue: 0.9 } }
          }
        }
      ]
    }
  });
  console.log('✅ Formatting applied');

  console.log(`\n🎉 DONE! Open your sheet:`);
  console.log(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit\n`);
}

populateSheet().catch(console.error);
