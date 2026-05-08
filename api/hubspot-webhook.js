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

const OWNER_MAP = {
  'default': 'Chloe Pascoe'
};

function mapOwner(ownerId) {
  return OWNER_MAP[ownerId] || OWNER_MAP['default'];
}

async function sendSlack(clientName, budget, owner, url) {
  if (!SLACK_WEBHOOK) return;
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [
        { type: "header", text: { type: "plain_text", text: "Deal Closed - Onboarding Auto-Created!", emoji: true } },
        { type: "section", fields: [
          { type: "mrkdwn", text: "*Client:*\n" + clientName },
          { type: "mrkdwn", text: "*Budget:*\n$" + (budget || 0).toLocaleString() + "/mo" },
          { type: "mrkdwn", text: "*Owner:*\n" + owner },
          { type: "mrkdwn", text: "*Source:*\nHubSpot Closed Won" }
        ]},
        { type: "section", text: { type: "mrkdwn", text: "<" + url + "|View Onboarding Sheet>" }}
      ]
    })
  }).catch(() => {});
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).send('Webhook active');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const dealData = payload.properties || payload;

    const clientName = dealData.dealname || dealData.name || 'Unknown Client';
    const amount = parseFloat(dealData.amount || dealData.monthly_budget || 0);
    const closeDate = dealData.closedate || new Date().toISOString();
    const industry = dealData.industry || '';
    const ownerId = dealData.hubspot_owner_id || '';

    const kickoffDateObj = new Date(closeDate);
    kickoffDateObj.setDate(kickoffDateObj.getDate() + 7);
    const kickoffDate = kickoffDateObj.toISOString().split('T')[0];

    const owner = mapOwner(ownerId);

    const sheets = google.sheets({ version: 'v4', auth: getAuth() });
    const weekDates = getWeekDates(kickoffDate);
    const clientTab = clientName;
    const accessTab = clientName + ' - Access';
    const kickoffTab = clientName + ' - Kickoff';

    // Create tabs individually (handles case where some already exist)
    for (const tab of [clientTab, accessTab, kickoffTab]) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] }
        });
      } catch (e) { /* tab exists */ }
    }

    // Gantt data
    const gantt = [
      ['Category', 'Task', 'Owner', 'Assigned To', 'W1\n'+weekDates[0], 'W2\n'+weekDates[1], 'W3\n'+weekDates[2], 'W4\n'+weekDates[3], 'W5\n'+weekDates[4], 'W6\n'+weekDates[5], 'W7\n'+weekDates[6], 'W8\n'+weekDates[7], 'W9\n'+weekDates[8], 'W10\n'+weekDates[9], 'W11\n'+weekDates[10], 'W12\n'+weekDates[11]],
      ['CLIENT: '+clientName, 'Budget: $'+amount.toLocaleString()+'/mo', industry, owner, '', '', '', '', '', '', '', '', '', '', '', ''],
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

    // Kickoff Call Questions
    const kickoffQuestions = [
      ['', '', ''],
      ['KICKOFF CALL QUESTIONS', '', ''],
      ['Client: ' + clientName, 'Industry: ' + industry, 'Budget: $' + amount.toLocaleString() + '/mo'],
      ['', '', ''],

      ['PAID MEDIA ACCOUNTS & HISTORY', '', ''],
      ['', '', ''],
      ['Question', 'Notes', 'Follow-up'],
      ['Which platforms are you currently running ads on?', '', ''],
      ['How long have these accounts been active?', '', ''],
      ['Who has been managing the accounts (in-house, agency, freelancer)?', '', ''],
      ['What is your current monthly spend across all platforms?', '', ''],
      ['What has been working well in your paid media efforts?', '', ''],
      ['What has NOT been working or where are you seeing challenges?', '', ''],
      ['Are there any campaigns or strategies you have tried and want to avoid?', '', ''],
      ['Do you have historical performance data we can review? (last 6-12 months)', '', ''],
      ['Are there any account restrictions or policy issues we should know about?', '', ''],
      ['', '', ''],

      ['GOALS & SUCCESS METRICS', '', ''],
      ['', '', ''],
      ['Question', 'Notes', 'Follow-up'],
      ['What is the primary goal for paid media? (leads, sales, awareness, other)', '', ''],
      ['What does success look like in 90 days?', '', ''],
      ['What are your target KPIs? (CPA, ROAS, CPL, etc.)', '', ''],
      ['What is an acceptable cost per acquisition/lead?', '', ''],
      ['Do you have a specific ROAS target?', '', ''],
      ['Are there seasonal trends we should plan around?', '', ''],
      ['What is your average customer lifetime value (LTV)?', '', ''],
      ['What is your sales cycle length?', '', ''],
      ['Are there specific products, services, or offers to prioritize?', '', ''],
      ['Do you have upcoming launches, promotions, or events to support?', '', ''],
      ['', '', ''],

      ['AUDIENCE & TARGETING', '', ''],
      ['', '', ''],
      ['Question', 'Notes', 'Follow-up'],
      ['Who is your ideal customer? (demographics, job titles, industries)', '', ''],
      ['What problems does your product/service solve for them?', '', ''],
      ['Are there customer segments that are more valuable than others?', '', ''],
      ['Who are your top 3 competitors?', '', ''],
      ['What differentiates you from competitors?', '', ''],
      ['Are there any audiences or geos to exclude?', '', ''],
      ['Do you have customer lists we can use for targeting/lookalikes?', '', ''],
      ['', '', ''],

      ['CREATIVE & MESSAGING', '', ''],
      ['', '', ''],
      ['Question', 'Notes', 'Follow-up'],
      ['What messaging or value props resonate most with your audience?', '', ''],
      ['Do you have existing creative assets we can use? (images, videos)', '', ''],
      ['Are there brand guidelines we need to follow?', '', ''],
      ['What is the approval process for ad creative?', '', ''],
      ['Are there any words, phrases, or imagery to avoid?', '', ''],
      ['', '', ''],

      ['TRACKING & ATTRIBUTION', '', ''],
      ['', '', ''],
      ['Question', 'Notes', 'Follow-up'],
      ['What CRM/marketing automation do you use?', '', ''],
      ['How do you currently track conversions?', '', ''],
      ['What is your attribution model? (first-touch, last-touch, multi-touch)', '', ''],
      ['Can we get access to your CRM for offline conversion tracking?', '', ''],
      ['Are there any data privacy considerations? (GDPR, CCPA)', '', ''],
      ['', '', ''],

      ['WORKING RELATIONSHIP', '', ''],
      ['', '', ''],
      ['Question', 'Notes', 'Follow-up'],
      ['Who is the main point of contact for day-to-day questions?', '', ''],
      ['Who are the key stakeholders and decision-makers?', '', ''],
      ['What is your preferred communication style? (Slack, email, calls)', '', ''],
      ['What cadence works best for status updates? (weekly, bi-weekly)', '', ''],
      ['What time zone are you in?', '', ''],
      ['Are there any internal processes or approvals we need to be aware of?', '', ''],
      ['What does the ideal agency partnership look like for you?', '', ''],
      ['Is there anything from past agency experiences you want us to do differently?', '', ''],
      ['', '', ''],

      ['WRAP-UP', '', ''],
      ['', '', ''],
      ['Question', 'Notes', 'Follow-up'],
      ['What questions do you have for us?', '', ''],
      ['Is there anything else we should know that we have not covered?', '', ''],
      ['What is the best way to get platform access set up this week?', '', ''],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: "'" + kickoffTab + "'!A1",
      valueInputOption: 'RAW', requestBody: { values: kickoffQuestions }
    });

    // Get sheet metadata for formatting
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = meta.data.sheets.find(s => s.properties.title === clientTab);
    const sheetId = sheet ? sheet.properties.sheetId : 0;
    const ksSheet = meta.data.sheets.find(s => s.properties.title === kickoffTab);

    // Format Gantt
    if (sheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [
          { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 280 }, fields: 'pixelSize' } },
        ]}
      });
    }

    // Format Kickoff
    if (ksSheet) {
      const ksId = ksSheet.properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [
          { repeatCell: { range: { sheetId: ksId, startRowIndex: 1, endRowIndex: 2 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.4, green: 0.2, blue: 0.6 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 14 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: ksId, startRowIndex: 4, endRowIndex: 5 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: ksId, startRowIndex: 17, endRowIndex: 18 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: ksId, startRowIndex: 31, endRowIndex: 32 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: ksId, startRowIndex: 42, endRowIndex: 43 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: ksId, startRowIndex: 51, endRowIndex: 52 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: ksId, startRowIndex: 60, endRowIndex: 61 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: ksId, startRowIndex: 72, endRowIndex: 73 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { updateDimensionProperties: { range: { sheetId: ksId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 500 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId: ksId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 350 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId: ksId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } },
        ]}
      });
    }

    const url = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit#gid=' + sheetId;
    await sendSlack(clientName, amount, owner, url);

    return res.status(200).json({
      success: true,
      message: 'Onboarding created from HubSpot',
      client: clientName,
      spreadsheet_url: url
    });
  } catch (err) {
    console.error('HubSpot webhook error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
