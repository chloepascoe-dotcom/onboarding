const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load service account credentials
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Mock sales data - this simulates what would come from your CRM
const MOCK_SALES_DATA = {
  client_name: "TechFlow Industries",
  services: ["paid_media"],
  monthly_budget: 75000,
  kickoff_date: "2026-05-15",
  industry: "B2B SaaS",
  contacts: [
    { name: "Sarah Mitchell", email: "sarah.mitchell@techflow.io", role: "VP of Marketing" }
  ],
  sales_notes: "Enterprise SaaS company looking to scale pipeline."
};

// Team assignments based on service type
const TEAM_ASSIGNMENTS = {
  paid_media: { name: "Alex Kim", id: "user_001", role: "Senior Paid Media Strategist" },
  seo_aeo: { name: "Sam Patel", id: "user_003", role: "SEO Director" },
  creative: { name: "Morgan Liu", id: "user_005", role: "Creative Director" }
};

// Gantt template for Paid Media (12 weeks)
const GANTT_TEMPLATE = [
  { category: "ACCESS & SETUP", task: "", owner: "", weeks: [] },
  { category: "", task: "Request platform access (Google, Meta, LinkedIn)", owner: "SG", weeks: [1] },
  { category: "", task: "Client grants access to all platforms", owner: "Client", weeks: [1] },
  { category: "", task: "Verify all access confirmed", owner: "SG", weeks: [2] },
  { category: "", task: "CRM access setup & validation", owner: "Both", weeks: [1, 2] },
  { category: "TRACKING & ANALYTICS", task: "", owner: "", weeks: [] },
  { category: "", task: "Audit existing tracking setup", owner: "SG", weeks: [1] },
  { category: "", task: "Create tracking implementation plan", owner: "SG", weeks: [1, 2] },
  { category: "", task: "Implement/update GTM container", owner: "SG", weeks: [2, 3] },
  { category: "", task: "Set up conversion actions", owner: "SG", weeks: [2, 3] },
  { category: "", task: "Validate all tracking fires correctly", owner: "SG", weeks: [3] },
  { category: "STRATEGY & PLANNING", task: "", owner: "", weeks: [] },
  { category: "", task: "⭐ Kickoff call", owner: "Both", weeks: [1], milestone: true },
  { category: "", task: "Historical performance analysis", owner: "SG", weeks: [1, 2] },
  { category: "", task: "Competitor research & ad library review", owner: "SG", weeks: [1, 2] },
  { category: "", task: "Define KPIs, targets, and success metrics", owner: "Both", weeks: [2] },
  { category: "", task: "Develop campaign strategy & structure", owner: "SG", weeks: [2, 3] },
  { category: "", task: "⭐ Strategy presentation & approval", owner: "Both", weeks: [3], milestone: true },
  { category: "CAMPAIGN BUILD", task: "", owner: "", weeks: [] },
  { category: "", task: "Create campaign naming conventions", owner: "SG", weeks: [2] },
  { category: "", task: "Build campaign structure (Google)", owner: "SG", weeks: [3, 4] },
  { category: "", task: "Build campaign structure (Meta)", owner: "SG", weeks: [3, 4] },
  { category: "", task: "Write ad copy (all platforms)", owner: "SG", weeks: [3, 4] },
  { category: "", task: "Request creative assets", owner: "SG", weeks: [3] },
  { category: "", task: "Upload creatives and finalize ads", owner: "SG", weeks: [4] },
  { category: "", task: "QA all campaigns before launch", owner: "SG", weeks: [4] },
  { category: "LAUNCH & OPTIMIZATION", task: "", owner: "", weeks: [] },
  { category: "", task: "⭐ Pre-launch checklist complete", owner: "SG", weeks: [4], milestone: true },
  { category: "", task: "⭐ Launch campaigns", owner: "SG", weeks: [5], milestone: true },
  { category: "", task: "Day 1-3 monitoring & adjustments", owner: "SG", weeks: [5] },
  { category: "", task: "Week 1 performance review", owner: "Both", weeks: [6] },
  { category: "", task: "Ongoing optimization", owner: "SG", weeks: [6, 7, 8, 9, 10, 11, 12] },
  { category: "REPORTING", task: "", owner: "", weeks: [] },
  { category: "", task: "Set up reporting dashboard", owner: "SG", weeks: [3, 4] },
  { category: "", task: "⭐ Weekly status calls", owner: "Both", weeks: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], milestone: true },
  { category: "", task: "⭐ Month 1 performance report", owner: "SG", weeks: [4], milestone: true },
  { category: "", task: "⭐ Month 2 performance report", owner: "SG", weeks: [8], milestone: true },
  { category: "", task: "⭐ 90-day review & strategy refresh", owner: "Both", weeks: [12], milestone: true },
];

// Calculate actual dates from kickoff date
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

// Build the spreadsheet data
function buildSheetData(salesData) {
  const weekDates = getWeekDates(salesData.kickoff_date);
  const assignedOwner = TEAM_ASSIGNMENTS[salesData.services[0]];

  // Header row with actual dates
  const headers = ['Category', 'Task', 'Owner', 'Assigned To'];
  weekDates.forEach((date, i) => {
    headers.push(`W${i + 1}\n${date}`);
  });

  const rows = [headers];

  // Add client info row
  rows.push([`CLIENT: ${salesData.client_name}`, `Budget: $${salesData.monthly_budget.toLocaleString()}/mo`, `Industry: ${salesData.industry}`, `Owner: ${assignedOwner.name}`, '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']); // Empty row

  // Add Gantt data
  GANTT_TEMPLATE.forEach(item => {
    const row = [item.category, item.task, item.owner, item.owner === 'SG' ? assignedOwner.name : item.owner];

    for (let w = 1; w <= 12; w++) {
      if (item.weeks.includes(w)) {
        row.push(item.milestone ? '⭐' : '✓');
      } else {
        row.push('');
      }
    }
    rows.push(row);
  });

  return rows;
}

async function createOnboardingSheet(salesData) {
  // Load credentials
  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  } catch (err) {
    console.error('❌ Could not load credentials.json');
    console.log('Make sure credentials.json is in the same folder as this script');
    process.exit(1);
  }

  // Authenticate
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  console.log(`\n🚀 Creating onboarding sheet for: ${salesData.client_name}`);
  console.log(`   Services: ${salesData.services.join(', ')}`);
  console.log(`   Kickoff: ${salesData.kickoff_date}`);
  console.log(`   Budget: $${salesData.monthly_budget.toLocaleString()}/mo\n`);

  // Create new spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `Onboarding - ${salesData.client_name} - ${new Date().toLocaleDateString()}`
      },
      sheets: [
        { properties: { title: 'Gantt Chart' } },
        { properties: { title: 'Access Checklist' } },
        { properties: { title: 'Contacts' } }
      ]
    }
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId;
  const spreadsheetUrl = spreadsheet.data.spreadsheetUrl;
  console.log(`✅ Spreadsheet created!`);

  // Build and insert Gantt data
  const sheetData = buildSheetData(salesData);

  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: 'Gantt Chart!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: sheetData
    }
  });
  console.log(`✅ Gantt chart populated with ${sheetData.length} rows`);

  // Add contacts
  const contactsData = [
    ['Name', 'Email', 'Role', 'Primary Contact'],
    ...salesData.contacts.map(c => [c.name, c.email, c.role, c.is_primary ? 'Yes' : 'No'])
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: 'Contacts!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: contactsData
    }
  });
  console.log(`✅ Contacts added`);

  // Add access checklist
  const accessData = [
    ['Platform', 'Status', 'Owner', 'Notes'],
    ['Google Ads', 'Pending', TEAM_ASSIGNMENTS[salesData.services[0]].name, ''],
    ['Meta Ads Manager', 'Pending', TEAM_ASSIGNMENTS[salesData.services[0]].name, ''],
    ['Google Analytics', 'Pending', TEAM_ASSIGNMENTS[salesData.services[0]].name, ''],
    ['Google Tag Manager', 'Pending', TEAM_ASSIGNMENTS[salesData.services[0]].name, ''],
    ['CRM Access', 'Pending', TEAM_ASSIGNMENTS[salesData.services[0]].name, '']
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: 'Access Checklist!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: accessData
    }
  });
  console.log(`✅ Access checklist added`);

  // Format the sheet (column widths, header formatting)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: {
      requests: [
        // Freeze header row
        {
          updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount'
          }
        },
        // Set column widths
        {
          updateDimensionProperties: {
            range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 150 },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
            properties: { pixelSize: 300 },
            fields: 'pixelSize'
          }
        },
        // Bold header row
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        }
      ]
    }
  });
  console.log(`✅ Formatting applied`);

  console.log(`\n🎉 SUCCESS!`);
  console.log(`\n📊 Open your sheet: ${spreadsheetUrl}\n`);

  return { spreadsheetId, spreadsheetUrl };
}

// Run it
createOnboardingSheet(MOCK_SALES_DATA).catch(console.error);
