const { google } = require('googleapis');

const SPREADSHEET_ID = '1SMGQKvizFBUkWce3yGGFzHYYz913-tjPh1kHtmCAPEA';
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  return new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
}

function getWeekDates(kickoffDate) {
  const dates = [];
  const start = new Date(kickoffDate);
  for (let i = 0; i < 12; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + (i * 7));
    dates.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return dates;
}

async function sendSlack(salesData, url) {
  if (!SLACK_WEBHOOK) return;
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [
        { type: "header", text: { type: "plain_text", text: "New Client Onboarding!", emoji: true } },
        { type: "section", fields: [
          { type: "mrkdwn", text: "*Client:*\n" + salesData.client_name },
          { type: "mrkdwn", text: "*Budget:*\n$" + salesData.monthly_budget.toLocaleString() + "/mo" },
          { type: "mrkdwn", text: "*Owner:*\n" + salesData.assigned_owner },
          { type: "mrkdwn", text: "*Kickoff:*\n" + salesData.kickoff_date }
        ]},
        { type: "section", text: { type: "mrkdwn", text: "<" + url + "|View Sheet>" }}
      ]
    })
  }).catch(() => {});
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const salesData = req.body;
    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    const weekDates = getWeekDates(salesData.kickoff_date);
    const owner = salesData.assigned_owner;
    const clientTab = salesData.client_name;
    const accessTab = clientTab + ' - Access';

    // Create tabs
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [
          { addSheet: { properties: { title: clientTab, index: 0 } } },
          { addSheet: { properties: { title: accessTab, index: 1 } } }
        ]}
      });
    } catch (e) {}

    // Gantt data
    const gantt = [
      ['Category', 'Task', 'Owner', 'Assigned To', 'W1\n'+weekDates[0], 'W2\n'+weekDates[1], 'W3\n'+weekDates[2], 'W4\n'+weekDates[3], 'W5\n'+weekDates[4], 'W6\n'+weekDates[5], 'W7\n'+weekDates[6], 'W8\n'+weekDates[7], 'W9\n'+weekDates[8], 'W10\n'+weekDates[9], 'W11\n'+weekDates[10], 'W12\n'+weekDates[11]],
      ['CLIENT: '+salesData.client_name, 'Budget: $'+salesData.monthly_budget.toLocaleString()+'/mo', salesData.industry||'', owner, '', '', '', '', '', '', '', '', '', '', '', ''],
      ['ACCESS & SETUP', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Request platform access', 'SG', owner, 'X', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Client grants access', 'Client', 'Client', 'X', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Verify all access confirmed', 'SG', owner, '', 'X', '', '', '', '', '', '', '', '', '', ''],
      ['TRACKING & ANALYTICS', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Audit existing tracking', 'SG', owner, 'X', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Implement GTM container', 'SG', owner, '', 'X', 'X', '', '', '', '', '', '', '', '', ''],
      ['', 'Set up conversion actions', 'SG', owner, '', 'X', 'X', '', '', '', '', '', '', '', '', ''],
      ['STRATEGY & PLANNING', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Kickoff call', 'Both', 'Both', 'M', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Competitor research', 'SG', owner, 'X', 'X', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Define KPIs and targets', 'Both', 'Both', '', 'X', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Strategy presentation', 'Both', 'Both', '', '', 'M', '', '', '', '', '', '', '', '', ''],
      ['CAMPAIGN BUILD', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Build Google campaigns', 'SG', owner, '', '', 'X', 'X', '', '', '', '', '', '', '', ''],
      ['', 'Build Meta campaigns', 'SG', owner, '', '', 'X', 'X', '', '', '', '', '', '', '', ''],
      ['', 'Write ad copy', 'SG', owner, '', '', 'X', 'X', '', '', '', '', '', '', '', ''],
      ['', 'QA all campaigns', 'SG', owner, '', '', '', 'X', '', '', '', '', '', '', '', ''],
      ['LAUNCH & OPTIMIZATION', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Launch campaigns', 'SG', owner, '', '', '', '', 'M', '', '', '', '', '', '', ''],
      ['', 'Week 1 performance review', 'Both', 'Both', '', '', '', '', '', 'X', '', '', '', '', '', ''],
      ['', 'Ongoing optimization', 'SG', owner, '', '', '', '', '', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['REPORTING', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Weekly status calls', 'Both', 'Both', '', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'],
      ['', '90-day review', 'Both', 'Both', '', '', '', '', '', '', '', '', '', '', '', 'M'],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: "'" + clientTab + "'!A1",
      valueInputOption: 'RAW', requestBody: { values: gantt }
    });

    // Access checklist
    const access = [
      ['Platform', 'Email/ID', 'Access Level', 'Team', 'Status', 'Date Requested', 'Date Confirmed', 'Notes'],
      ['Google Analytics 4', 'analytics@singlegrain.com', 'Editor', 'All', 'Pending', '', '', ''],
      ['Google Tag Manager', 'analytics@singlegrain.com', 'Admin', 'All', 'Pending', '', '', ''],
      ['Google Ads', 'adwords@singlegrain.com', 'Admin', 'Paid Media', 'Pending', '', '', ''],
      ['Meta Ads', 'Partner ID: 10152546861047072', 'Full Control', 'Paid Media', 'Pending', '', '', ''],
      ['LinkedIn Ads', 'Partner ID: 7186746961612406786', 'Admin', 'Paid Media', 'Pending', '', '', ''],
      ['Microsoft Ads', 'adwords@singlegrain.com', 'Super Admin', 'Paid Media', 'Pending', '', '', ''],
      ['TikTok Ads', 'BC ID: 6998239304547909634', 'Admin', 'Paid Media', 'Pending', '', '', ''],
      ['CRM', 'adwords@singlegrain.com', 'Varies', 'All', 'Pending', '', '', ''],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: "'" + accessTab + "'!A1",
      valueInputOption: 'RAW', requestBody: { values: access }
    });

    // Get sheet ID
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = meta.data.sheets.find(s => s.properties.title === clientTab);
    const sheetId = sheet ? sheet.properties.sheetId : 0;

    // Format
    if (sheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [
          { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 280 }, fields: 'pixelSize' } },
        ]}
      });
    }

    const url = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit#gid=' + sheetId;
    await sendSlack(salesData, url);
    
    return res.status(200).json({ success: true, spreadsheet_url: url });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
