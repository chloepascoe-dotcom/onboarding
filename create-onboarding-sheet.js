const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load service account credentials
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TEMPLATES_PATH = path.join(__dirname, 'onboarding-templates.json');

// Load onboarding templates
let ONBOARDING_TEMPLATES;
try {
  ONBOARDING_TEMPLATES = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
  console.log('✅ Loaded onboarding templates for:', Object.keys(ONBOARDING_TEMPLATES.services).join(', '));
} catch (err) {
  console.error('❌ Could not load onboarding-templates.json');
  process.exit(1);
}

// Mock sales data - this simulates what would come from your CRM
const MOCK_SALES_DATA = {
  client_name: "TechFlow Industries",
  services: ["paid_media", "seo_aeo"],  // Can now handle multiple services
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

// Convert template JSON to Gantt format
function getGanttTemplateForService(serviceKey) {
  const serviceTemplate = ONBOARDING_TEMPLATES.services[serviceKey];
  if (!serviceTemplate) {
    console.error(`❌ Unknown service type: ${serviceKey}`);
    return [];
  }

  const ganttRows = [];

  serviceTemplate.categories.forEach(category => {
    // Add category header row
    ganttRows.push({
      category: category.name.toUpperCase(),
      task: "",
      owner: "",
      weeks: []
    });

    // Add task rows
    category.tasks.forEach(task => {
      ganttRows.push({
        category: "",
        task: task.milestone ? `⭐ ${task.task}` : task.task,
        owner: task.owner,
        weeks: task.weeks,
        milestone: task.milestone || false
      });
    });
  });

  return ganttRows;
}

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

// Build the spreadsheet data for a specific service
function buildSheetData(salesData, serviceKey) {
  const weekDates = getWeekDates(salesData.kickoff_date);
  const assignedOwner = TEAM_ASSIGNMENTS[serviceKey];
  const ganttTemplate = getGanttTemplateForService(serviceKey);
  const serviceName = ONBOARDING_TEMPLATES.services[serviceKey]?.name || serviceKey;

  // Header row with actual dates
  const headers = ['Category', 'Task', 'Owner', 'Assigned To'];
  weekDates.forEach((date, i) => {
    headers.push(`W${i + 1}\n${date}`);
  });

  const rows = [headers];

  // Add client info row
  rows.push([
    `CLIENT: ${salesData.client_name}`,
    `Service: ${serviceName}`,
    `Budget: $${salesData.monthly_budget.toLocaleString()}/mo`,
    `Owner: ${assignedOwner.name}`,
    '', '', '', '', '', '', '', '', '', '', '', ''
  ]);
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']); // Empty row

  // Add Gantt data from template
  ganttTemplate.forEach(item => {
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

  // Build sheet list dynamically based on services
  const sheetConfigs = [];

  // Add a Gantt sheet for each service
  salesData.services.forEach(service => {
    const serviceName = ONBOARDING_TEMPLATES.services[service]?.name || service;
    sheetConfigs.push({ properties: { title: `Gantt - ${serviceName}` } });
  });

  // Add standard sheets
  sheetConfigs.push({ properties: { title: 'Access Checklist' } });
  sheetConfigs.push({ properties: { title: 'Contacts' } });

  // Create new spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `Onboarding - ${salesData.client_name} - ${new Date().toLocaleDateString()}`
      },
      sheets: sheetConfigs
    }
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId;
  const spreadsheetUrl = spreadsheet.data.spreadsheetUrl;
  console.log(`✅ Spreadsheet created with ${salesData.services.length} service sheet(s)!`);

  // Build and insert Gantt data for EACH service
  for (const service of salesData.services) {
    const serviceName = ONBOARDING_TEMPLATES.services[service]?.name || service;
    const sheetData = buildSheetData(salesData, service);

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `Gantt - ${serviceName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: sheetData
      }
    });
    console.log(`✅ ${serviceName} Gantt chart populated with ${sheetData.length} rows`);
  }

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

  // Build access checklist based on services
  const accessData = [['Platform', 'Status', 'Owner', 'Service', 'Notes']];

  // Access requirements by service type
  const ACCESS_BY_SERVICE = {
    paid_media: [
      'Google Ads', 'Meta Ads Manager', 'LinkedIn Ads', 'Google Analytics',
      'Google Tag Manager', 'CRM Access'
    ],
    seo_aeo: [
      'Google Search Console', 'Google Analytics', 'CMS Access',
      'Ahrefs/SEMrush', 'Dev Environment Access'
    ],
    creative: [
      'Brand Asset Library', 'Design System/Guidelines', 'Stock Photo Accounts',
      'Video Asset Access', 'Landing Page Builder'
    ]
  };

  salesData.services.forEach(service => {
    const serviceName = ONBOARDING_TEMPLATES.services[service]?.name || service;
    const owner = TEAM_ASSIGNMENTS[service]?.name || 'TBD';
    const platforms = ACCESS_BY_SERVICE[service] || [];

    platforms.forEach(platform => {
      accessData.push([platform, 'Pending', owner, serviceName, '']);
    });
  });

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
