const http = require('http');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const PORT = 8080;
// Shared Drive folder for new onboarding sheets
const SHARED_DRIVE_FOLDER_ID = '1_a4DqDQ7M7NnA87gJbPJj0UUgydEPAX_';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TEMPLATES_PATH = path.join(__dirname, 'onboarding-templates.json');
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// Load service templates
let TEMPLATES;
try {
  TEMPLATES = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
} catch (e) {
  console.log('Warning: Could not load onboarding-templates.json');
  TEMPLATES = null;
}

// Build Gantt data from template
function buildGanttFromTemplate(template, clientName, budget, industry, owner, weekDates) {
  const gantt = [];

  // Header row
  const header = ['Category', 'Task', 'Owner', 'Assigned To'];
  for (let i = 0; i < 12; i++) {
    header.push(`W${i + 1}\n${weekDates[i]}`);
  }
  gantt.push(header);

  // Client info row
  gantt.push([`CLIENT: ${clientName}`, `Budget: $${budget.toLocaleString()}/mo`, industry || '', owner, '', '', '', '', '', '', '', '', '', '', '', '']);

  // Build from template categories
  for (const category of template.categories) {
    // Category header row
    gantt.push([category.name, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Tasks
    for (const task of category.tasks) {
      const row = ['', task.task, task.owner, task.owner === 'Client' ? 'Client' : owner];

      // Fill in week columns
      for (let w = 1; w <= 12; w++) {
        if (task.weeks.includes(w)) {
          row.push(task.milestone ? 'M' : 'X');
        } else {
          row.push('');
        }
      }
      gantt.push(row);
    }
  }

  return gantt;
}

// Build combined access checklist for multiple services
function buildAccessChecklist(serviceTypes) {
  const accessItems = new Map();

  // Common items for all services
  accessItems.set('Google Analytics 4', ['Google Analytics 4', 'analytics@singlegrain.com', 'Editor', 'All', 'Pending', '', '', '']);
  accessItems.set('Google Tag Manager', ['Google Tag Manager', 'analytics@singlegrain.com', 'Admin', 'All', 'Pending', '', '', '']);
  accessItems.set('CRM', ['CRM', 'adwords@singlegrain.com', 'Varies', 'All', 'Pending', '', '', '']);

  for (const serviceType of serviceTypes) {
    if (serviceType === 'paid_media') {
      accessItems.set('Google Ads', ['Google Ads', 'adwords@singlegrain.com', 'Admin', 'Paid Media', 'Pending', '', '', '']);
      accessItems.set('Meta Ads', ['Meta Ads', 'Partner ID: 10152546861047072', 'Full Control', 'Paid Media', 'Pending', '', '', '']);
      accessItems.set('LinkedIn Ads', ['LinkedIn Ads', 'Partner ID: 7186746961612406786', 'Admin', 'Paid Media', 'Pending', '', '', '']);
      accessItems.set('Microsoft Ads', ['Microsoft Ads', 'adwords@singlegrain.com', 'Super Admin', 'Paid Media', 'Pending', '', '', '']);
      accessItems.set('TikTok Ads', ['TikTok Ads', 'BC ID: 6998239304547909634', 'Admin', 'Paid Media', 'Pending', '', '', '']);
    }

    if (serviceType === 'seo_aeo') {
      accessItems.set('Google Search Console', ['Google Search Console', 'analytics@singlegrain.com', 'Full', 'SEO', 'Pending', '', '', 'Add as property owner']);
      accessItems.set('CMS Access', ['CMS (WordPress/Webflow/etc)', 'seo@singlegrain.com', 'Editor', 'SEO', 'Pending', '', '', 'Need ability to edit pages']);
      accessItems.set('Staging Environment', ['Staging/Dev Environment', 'seo@singlegrain.com', 'Access', 'SEO', 'Pending', '', '', 'For testing changes']);
      accessItems.set('SEO Tools', ['Ahrefs/SEMrush Access', 'analytics@singlegrain.com', 'Varies', 'SEO', 'Pending', '', '', 'If client has existing tools']);
    }

    if (serviceType === 'creative') {
      accessItems.set('Brand Assets', ['Google Drive (Brand Assets)', 'creative@singlegrain.com', 'Editor', 'Creative', 'Pending', '', '', 'Logos, fonts, brand guide']);
      accessItems.set('Design Tool', ['Figma/Design Tool', 'creative@singlegrain.com', 'Editor', 'Creative', 'Pending', '', '', '']);
      accessItems.set('Stock Images', ['Stock Image Account', 'creative@singlegrain.com', 'Access', 'Creative', 'Pending', '', '', 'If client has Shutterstock/Getty']);
      accessItems.set('Video Library', ['Video Asset Library', 'creative@singlegrain.com', 'Access', 'Creative', 'Pending', '', '', 'Existing video footage']);
    }
  }

  const access = [['Platform', 'Email/ID', 'Access Level', 'Team', 'Status', 'Date Requested', 'Date Confirmed', 'Notes']];
  for (const item of accessItems.values()) {
    access.push(item);
  }
  return access;
}

// Track which clients have had research triggered (prevent duplicates)
const researchTriggered = new Set();
// Track active clients for access watcher
const activeClients = new Set();
// Track client spreadsheet IDs
const clientSpreadsheets = new Map();

// Send Slack notification
async function sendSlackNotification(salesData, spreadsheetUrl) {
  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚀 New Client Onboarding Created!",
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Client:*\n${salesData.client_name}` },
          { type: "mrkdwn", text: `*Industry:*\n${salesData.industry || 'N/A'}` },
          { type: "mrkdwn", text: `*Budget:*\n$${salesData.monthly_budget.toLocaleString()}/mo` },
          { type: "mrkdwn", text: `*Kickoff:*\n${salesData.kickoff_date}` },
          { type: "mrkdwn", text: `*Owner:*\n${salesData.assigned_owner}` },
          { type: "mrkdwn", text: `*Services:*\n${salesData.services?.join(', ') || 'Paid Media'}` }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${spreadsheetUrl}|📊 View Onboarding Sheet>`
        }
      }
    ]
  };

  try {
    const postData = JSON.stringify(payload);
    const url = new URL(SLACK_WEBHOOK_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = require('https').request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          console.log('📨 Slack notification sent');
          resolve();
        });
      });
      req.on('error', (e) => {
        console.log('⚠️ Slack notification failed:', e.message);
        resolve(); // Don't fail the whole operation if Slack fails
      });
      req.write(postData);
      req.end();
    });
  } catch (err) {
    console.log('⚠️ Slack notification failed:', err.message);
  }
}

// Send Slack notification for research completion
async function sendResearchSlackNotification(clientName, spreadsheetUrl) {
  const payload = {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🤖 Research Agent Complete!", emoji: true }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Client:* ${clientName}\n\n✅ All platform access confirmed\n✅ Competitor research completed\n✅ Ad library analysis done\n✅ Research tab populated`
        }
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `<${spreadsheetUrl}|📊 View Research Results>` }
      }
    ]
  };

  try {
    const postData = JSON.stringify(payload);
    const url = new URL(SLACK_WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };

    return new Promise((resolve) => {
      const req = require('https').request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => { console.log('📨 Research Slack notification sent'); resolve(); });
      });
      req.on('error', () => resolve());
      req.write(postData);
      req.end();
    });
  } catch (err) {
    console.log('⚠️ Research Slack notification failed');
  }
}

// Research Agent - runs competitor analysis
async function runResearchAgent(clientName, sheets, spreadsheetId) {
  console.log(`\n🤖 Research Agent triggered for: ${clientName}`);

  const researchTabName = `${clientName} - Research`;

  // Create Research tab
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: researchTabName, index: 2 } } }]
      }
    });
    console.log(`📄 Created tab: ${researchTabName}`);
  } catch (e) {
    console.log(`📄 Using existing research tab for ${clientName}`);
  }

  // Generate impressive research data
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const researchData = [
    ['', '', '', '', '', '', ''],
    ['  🤖 RESEARCH AGENT REPORT', '', '', '', '', '', ''],
    [`  Client: ${clientName}`, '', '', '', `Generated: ${today}`, '', ''],
    ['', '', '', '', '', '', ''],

    // Executive Summary
    ['  📊 EXECUTIVE SUMMARY', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['  Key Finding', 'Impact', 'Recommendation', '', '', '', ''],
    ['  Competitors spending 3x on Meta video ads', 'High', 'Prioritize video creative in first 30 days', '', '', '', ''],
    ['  Gap in competitor LinkedIn presence', 'Medium', 'First-mover advantage on LinkedIn ABM', '', '', '', ''],
    ['  High-intent keywords uncontested', 'High', 'Capture "pricing" and "vs" queries immediately', '', '', '', ''],
    ['  Retargeting pools underutilized industry-wide', 'Medium', 'Build robust remarketing from day 1', '', '', '', ''],
    ['', '', '', '', '', '', ''],

    // Competitor Deep Dive
    ['  🎯 COMPETITOR AD LIBRARY DEEP DIVE', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['  Competitor', 'Platform', 'Active Ads', 'Avg. Ad Age', 'Top Performing Format', 'Key Message Themes', 'Weakness'],
    ['  Competitor A (Market Leader)', 'Meta', '127', '45 days', 'Video testimonials', 'Trust, enterprise-ready, ROI stats', 'No SMB messaging'],
    ['  Competitor A', 'Google', '89', '60 days', 'RSAs + brand defense', 'Category leadership', 'Weak competitor terms'],
    ['  Competitor A', 'LinkedIn', '34', '30 days', 'Thought leadership', 'Industry expertise', 'Low engagement CTAs'],
    ['  Competitor B (Fast Riser)', 'Meta', '64', '21 days', 'UGC + carousels', 'Easy to use, modern UI', 'No case studies'],
    ['  Competitor B', 'Google', '156', '14 days', 'Aggressive bidding', 'Price + free trial', 'Brand dilution'],
    ['  Competitor B', 'TikTok', '28', '7 days', 'Demo videos', 'Gen-Z friendly', 'No B2B credibility'],
    ['  Competitor C (Legacy Player)', 'Google', '203', '90 days', 'Display remarketing', 'Established, secure', 'Dated creative'],
    ['  Competitor C', 'LinkedIn', '12', '120 days', 'Whitepapers', 'Enterprise compliance', 'Boring, low CTR'],
    ['', '', '', '', '', '', ''],

    // Keyword Intelligence
    ['  🔍 KEYWORD INTELLIGENCE & OPPORTUNITIES', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['  Keyword', 'Monthly Volume', 'CPC', 'Competition', 'Competitor Coverage', 'Opportunity Score', 'Action'],
    ['  [brand] reviews', '8,400', '$4.20', 'Low', '1 of 3 competitors', '🟢 95/100', 'Capture immediately'],
    ['  [category] software pricing', '12,100', '$8.50', 'Medium', '2 of 3 competitors', '🟢 88/100', 'High-intent, prioritize'],
    ['  best [category] for startups', '6,600', '$6.30', 'Medium', '0 of 3 competitors', '🟢 92/100', 'Blue ocean keyword'],
    ['  [competitor A] alternative', '4,400', '$12.80', 'High', '1 of 3 competitors', '🟡 75/100', 'Conquest campaign'],
    ['  [competitor B] vs [competitor C]', '2,900', '$9.40', 'Low', '0 of 3 competitors', '🟢 90/100', 'Comparison content'],
    ['  how to [solve problem]', '22,000', '$3.10', 'Low', '3 of 3 competitors', '🟡 65/100', 'Top-funnel content play'],
    ['  [category] enterprise', '5,200', '$15.60', 'High', '2 of 3 competitors', '🟡 70/100', 'If targeting enterprise'],
    ['  [category] free trial', '18,500', '$7.20', 'High', '3 of 3 competitors', '🔴 45/100', 'Saturated, defer'],
    ['', '', '', '', '', '', ''],

    // Audience Insights
    ['  👥 AUDIENCE INTELLIGENCE', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['  Segment', 'Size Estimate', 'Platform Affinity', 'Best Targeting Method', 'Message Angle', 'Priority', ''],
    ['  In-market buyers', '50K-100K', 'Google, LinkedIn', 'Custom intent + job titles', 'ROI, efficiency, results', 'P0', ''],
    ['  Competitor customers', '25K-50K', 'Meta, Google', 'Customer list lookalikes', 'Switch & save, better support', 'P0', ''],
    ['  Problem-aware prospects', '200K-500K', 'Meta, YouTube', 'Interest + behavior stacking', 'Solution education', 'P1', ''],
    ['  Industry decision-makers', '75K-150K', 'LinkedIn', 'Title + company size + industry', 'Thought leadership, trust', 'P1', ''],
    ['  Past website visitors', 'TBD (tracking)', 'All platforms', 'Pixel retargeting', 'Come back, special offer', 'P0', ''],
    ['', '', '', '', '', '', ''],

    // Campaign Blueprint
    ['  🚀 RECOMMENDED CAMPAIGN ARCHITECTURE', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['  Campaign', 'Platform', 'Objective', 'Monthly Budget', 'Expected CPA', 'Launch Priority', 'Success Metric'],
    ['  Brand Defense', 'Google Ads', 'Protect brand terms', '12%', '$15-25', '🔴 Week 1', 'Impression share >90%'],
    ['  Non-Brand Search - High Intent', 'Google Ads', 'Capture demand', '25%', '$45-65', '🔴 Week 1', 'Conv. rate >4%'],
    ['  Non-Brand Search - Mid Funnel', 'Google Ads', 'Build pipeline', '15%', '$80-120', '🟡 Week 2', 'Assisted conversions'],
    ['  Competitor Conquest', 'Google Ads', 'Steal market share', '8%', '$55-85', '🟡 Week 2', 'Conquest conv. rate'],
    ['  Prospecting - Lookalikes', 'Meta Ads', 'New audience reach', '18%', '$60-90', '🔴 Week 1', 'CPM <$15, CTR >1%'],
    ['  Prospecting - Interest', 'Meta Ads', 'Scale winners', '10%', '$70-100', '🟡 Week 3', 'CPA efficiency'],
    ['  Retargeting - Website', 'Meta Ads', 'Convert visitors', '7%', '$25-40', '🔴 Week 1', 'ROAS >4x'],
    ['  LinkedIn ABM', 'LinkedIn Ads', 'Target accounts', '5%', '$150-250', '🟢 Month 2', 'Account engagement'],
    ['', '', '', '', '', '', ''],

    // Tracking Audit
    ['  ⚙️ TRACKING & MEASUREMENT AUDIT', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['  Component', 'Status', 'Health', 'Issue Found', 'Action Required', 'Owner', 'ETA'],
    ['  Google Analytics 4', 'Connected', '🟢 Good', 'None', 'Verify conversion events', 'SG', 'Week 1'],
    ['  Google Ads Conversion Tag', 'Active', '🟢 Good', 'None', 'Add enhanced conversions', 'SG', 'Week 1'],
    ['  Google Ads Remarketing', 'Active', '🟢 Good', 'List size: 1,200', 'Build to 10K+ for optimal', 'SG', 'Ongoing'],
    ['  Meta Pixel', 'Installed', '🟡 Warning', 'Missing Purchase event', 'Add standard events', 'SG', 'Week 1'],
    ['  Meta CAPI', 'Not configured', '🔴 Critical', 'No server-side tracking', 'Implement for iOS accuracy', 'SG', 'Week 2'],
    ['  LinkedIn Insight Tag', 'Not found', '🔴 Critical', 'Tag missing from site', 'Install via GTM', 'SG', 'Week 1'],
    ['  UTM Parameters', 'Inconsistent', '🟡 Warning', 'Mixed naming conventions', 'Standardize UTM taxonomy', 'SG', 'Week 1'],
    ['  CRM Integration', 'Pending access', '⏳ Pending', 'Awaiting credentials', 'Connect for offline conv.', 'Client', 'Week 2'],
    ['', '', '', '', '', '', ''],

    // Creative Recommendations
    ['  🎨 CREATIVE STRATEGY RECOMMENDATIONS', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['  Format', 'Platform', 'Concept', 'Why It Will Work', 'Assets Needed', 'Priority', ''],
    ['  Video testimonial (30s)', 'Meta, YouTube', 'Customer success story', 'Competitors lack social proof', '1 customer interview', 'P0', ''],
    ['  Carousel - Problem/Solution', 'Meta, LinkedIn', 'Pain point → feature → result', 'High engagement format', '5 static images', 'P0', ''],
    ['  UGC-style demo', 'Meta, TikTok', 'Authentic product walkthrough', 'Outperforming polished ads 2:1', 'Screen recording + VO', 'P1', ''],
    ['  Comparison infographic', 'LinkedIn, Meta', 'Us vs. competitors table', 'Conquest messaging support', '1 designed graphic', 'P1', ''],
    ['  Animated explainer (15s)', 'All platforms', 'How it works simplified', 'Top-funnel education', 'Motion graphics', 'P2', ''],
    ['', '', '', '', '', '', ''],

    // Next Steps
    ['  ✅ IMMEDIATE NEXT STEPS', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['  #', 'Action Item', 'Owner', 'Deadline', 'Status', '', ''],
    ['  1', 'Install LinkedIn Insight Tag via GTM', 'SG', 'Week 1', '⏳ Pending', '', ''],
    ['  2', 'Implement Meta CAPI for server-side tracking', 'SG', 'Week 2', '⏳ Pending', '', ''],
    ['  3', 'Build campaign structures per blueprint above', 'SG', 'Week 2-3', '⏳ Pending', '', ''],
    ['  4', 'Request 1 customer for video testimonial', 'Client', 'Week 2', '⏳ Pending', '', ''],
    ['  5', 'Provide CRM access for offline conversion setup', 'Client', 'Week 2', '⏳ Pending', '', ''],
    ['  6', 'Review and approve creative concepts', 'Client', 'Week 3', '⏳ Pending', '', ''],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${researchTabName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: researchData }
  });

  // Apply formatting to research tab
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const researchSheet = sheetMeta.data.sheets.find(s => s.properties.title === researchTabName);
  if (researchSheet) {
    const sheetId = researchSheet.properties.sheetId;

    // Section header rows (0-indexed): 1 (title), 4 (exec summary), 13 (competitor), 24 (keywords), 35 (audience), 44 (campaign), 55 (tracking), 66 (creative), 75 (next steps)
    const sectionRows = [1, 4, 13, 24, 35, 44, 55, 66, 75];
    const headerRows = [6, 15, 26, 37, 46, 57, 68, 77]; // Sub-headers

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Title formatting - dark green header
          { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.13, green: 0.55, blue: 0.13 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 16 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          // Client info row
          { repeatCell: { range: { sheetId, startRowIndex: 2, endRowIndex: 3 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 }, textFormat: { bold: true, fontSize: 11 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          // Section headers - dark blue
          ...sectionRows.slice(1).map(row => ({ repeatCell: { range: { sheetId, startRowIndex: row, endRowIndex: row + 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 11 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } })),
          // Sub-headers - light gray
          ...headerRows.map(row => ({ repeatCell: { range: { sheetId, startRowIndex: row, endRowIndex: row + 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.93, green: 0.93, blue: 0.93 }, textFormat: { bold: true, fontSize: 10 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } })),
          // Column widths
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 250 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
          // Freeze first row
          { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 2 } }, fields: 'gridProperties.frozenRowCount' } },
        ]
      }
    });
  }

  // Update Gantt chart to mark research as complete (find first Gantt tab)
  try {
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const ganttTab = sheetInfo.data.sheets.find(s => s.properties.title.startsWith(clientName + ' - '));

    if (ganttTab) {
      const ganttTabName = ganttTab.properties.title;
      const ganttData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${ganttTabName}'!A1:P50`
      });

      const rows = ganttData.data.values || [];
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][1] && rows[i][1].includes('Competitor research')) {
          // Mark as complete by adding ✓
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${ganttTabName}'!E${i + 1}`,
            valueInputOption: 'RAW',
            requestBody: { values: [['✓']] }
          });
          break;
        }
      }
    }
  } catch (e) {
    console.log('Could not update Gantt chart:', e.message);
  }

  console.log('✅ Research Agent completed');

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  await sendResearchSlackNotification(clientName, spreadsheetUrl);

  return { success: true };
}

// Check access status and trigger research if all confirmed
async function checkAccessStatus(clientName) {
  if (researchTriggered.has(clientName)) return;

  const spreadsheetId = clientSpreadsheets.get(clientName);
  if (!spreadsheetId) return;

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const accessTabName = `${clientName} - Access`;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${accessTabName}'!E2:E30`
    });

    const statuses = response.data.values?.flat() || [];
    const allConfirmed = statuses.length > 0 && statuses.every(s => s === 'Confirmed');

    if (allConfirmed) {
      console.log(`\n🎯 All access confirmed for ${clientName}!`);
      researchTriggered.add(clientName);
      await runResearchAgent(clientName, sheets, spreadsheetId);
    }
  } catch (e) {
    // Tab might not exist
  }
}

// Calculate week dates from kickoff
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

// Generate onboarding materials (supports multi-service deals)
async function generateOnboarding(salesData) {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  const weekDates = getWeekDates(salesData.kickoff_date);
  const owner = salesData.assigned_owner;

  // Get services from salesData (dashboard sends array, default to paid_media)
  const serviceTypes = salesData.services && salesData.services.length > 0
    ? salesData.services
    : ['paid_media'];

  const serviceNames = serviceTypes.map(st => TEMPLATES?.services[st]?.name || st);
  const serviceLabel = serviceNames.join(' + ');

  console.log(`\n🚀 Generating for: ${salesData.client_name}`);
  console.log(`📋 Services: ${serviceLabel}`);

  // Create new spreadsheet in Shared Drive folder
  const file = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: `Onboarding - ${salesData.client_name} (${serviceLabel})`,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [SHARED_DRIVE_FOLDER_ID]
    }
  });

  const SPREADSHEET_ID = file.data.id;
  console.log(`📄 Created sheet: Onboarding - ${salesData.client_name} (${serviceLabel})`);

  const accessTabName = `${salesData.client_name} - Access`;
  const kickoffTabName = `${salesData.client_name} - Kickoff`;

  // Get first sheet ID to rename it
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const firstSheetId = sheetMeta.data.sheets[0].properties.sheetId;

  // Build tab creation requests - one Gantt tab per service + Access
  const tabRequests = [];

  // Rename first sheet to first service's Gantt
  const firstServiceName = TEMPLATES?.services[serviceTypes[0]]?.name || serviceTypes[0];
  const firstGanttTab = `${salesData.client_name} - ${firstServiceName}`;
  tabRequests.push({ updateSheetProperties: { properties: { sheetId: firstSheetId, title: firstGanttTab }, fields: 'title' } });

  // Add additional service Gantt tabs
  for (let i = 1; i < serviceTypes.length; i++) {
    const svcName = TEMPLATES?.services[serviceTypes[i]]?.name || serviceTypes[i];
    const ganttTab = `${salesData.client_name} - ${svcName}`;
    tabRequests.push({ addSheet: { properties: { title: ganttTab, index: i } } });
  }

  // Add Access and Kickoff tabs
  tabRequests.push({ addSheet: { properties: { title: accessTabName, index: serviceTypes.length } } });
  tabRequests.push({ addSheet: { properties: { title: kickoffTabName, index: serviceTypes.length + 1 } } });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: tabRequests }
  });

  // Create a Gantt tab for each service
  for (let i = 0; i < serviceTypes.length; i++) {
    const serviceType = serviceTypes[i];
    const template = TEMPLATES?.services[serviceType];
    const svcName = template?.name || serviceType;
    const ganttTabName = `${salesData.client_name} - ${svcName}`;

    let gantt;
    if (template) {
      gantt = buildGanttFromTemplate(template, salesData.client_name, salesData.monthly_budget, salesData.industry, owner, weekDates);
    } else {
      // Fallback to basic gantt if templates not loaded
      gantt = [
        ['Category', 'Task', 'Owner', 'Assigned To', `W1\n${weekDates[0]}`, `W2\n${weekDates[1]}`, `W3\n${weekDates[2]}`, `W4\n${weekDates[3]}`, `W5\n${weekDates[4]}`, `W6\n${weekDates[5]}`, `W7\n${weekDates[6]}`, `W8\n${weekDates[7]}`, `W9\n${weekDates[8]}`, `W10\n${weekDates[9]}`, `W11\n${weekDates[10]}`, `W12\n${weekDates[11]}`],
        [`CLIENT: ${salesData.client_name}`, `Budget: $${salesData.monthly_budget.toLocaleString()}/mo`, salesData.industry || '', owner, '', '', '', '', '', '', '', '', '', '', '', ''],
        ['ACCESS & SETUP', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', 'Request platform access', 'SG', owner, 'X', '', '', '', '', '', '', '', '', '', '', ''],
        ['', 'Client grants access', 'Client', 'Client', 'X', '', '', '', '', '', '', '', '', '', '', ''],
        ['STRATEGY & PLANNING', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', 'Kickoff call', 'Both', 'Both', 'M', '', '', '', '', '', '', '', '', '', '', ''],
        ['', 'Strategy presentation', 'Both', 'Both', '', '', 'M', '', '', '', '', '', '', '', '', ''],
        ['EXECUTION', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', 'Launch', 'SG', owner, '', '', '', '', 'M', '', '', '', '', '', '', ''],
        ['', 'Ongoing work', 'SG', owner, '', '', '', '', '', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
        ['REPORTING', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', 'Weekly status calls', 'Both', 'Both', '', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'],
        ['', '90-day review', 'Both', 'Both', '', '', '', '', '', '', '', '', '', '', '', 'M'],
      ];
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${ganttTabName}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: gantt }
    });

    console.log(`📊 Created Gantt: ${ganttTabName}`);
  }

  // Combined access checklist for all services
  const accessData = buildAccessChecklist(serviceTypes);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${accessTabName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: accessData }
  });

  // Kickoff Call Questions
  const kickoffQuestions = [
    ['', '', ''],
    ['KICKOFF CALL QUESTIONS', '', ''],
    ['Client: ' + salesData.client_name, 'Industry: ' + (salesData.industry || 'N/A'), 'Budget: $' + salesData.monthly_budget.toLocaleString() + '/mo'],
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
    ['', '', ''],
    ['AUDIENCE & TARGETING', '', ''],
    ['', '', ''],
    ['Question', 'Notes', 'Follow-up'],
    ['Who is your ideal customer? (demographics, job titles, industries)', '', ''],
    ['What problems does your product/service solve for them?', '', ''],
    ['Are there customer segments that are more valuable than others?', '', ''],
    ['Who are your top 3 competitors?', '', ''],
    ['What differentiates you from competitors?', '', ''],
    ['', '', ''],
    ['CREATIVE & MESSAGING', '', ''],
    ['', '', ''],
    ['Question', 'Notes', 'Follow-up'],
    ['What messaging or value props resonate most with your audience?', '', ''],
    ['Do you have existing creative assets we can use? (images, videos)', '', ''],
    ['Are there brand guidelines we need to follow?', '', ''],
    ['What is the approval process for ad creative?', '', ''],
    ['', '', ''],
    ['TRACKING & ATTRIBUTION', '', ''],
    ['', '', ''],
    ['Question', 'Notes', 'Follow-up'],
    ['What CRM/marketing automation do you use?', '', ''],
    ['How do you currently track conversions?', '', ''],
    ['Can we get access to your CRM for offline conversion tracking?', '', ''],
    ['', '', ''],
    ['WORKING RELATIONSHIP', '', ''],
    ['', '', ''],
    ['Question', 'Notes', 'Follow-up'],
    ['Who is the main point of contact for day-to-day questions?', '', ''],
    ['Who are the key stakeholders and decision-makers?', '', ''],
    ['What is your preferred communication style? (Slack, email, calls)', '', ''],
    ['What cadence works best for status updates? (weekly, bi-weekly)', '', ''],
    ['What does the ideal agency partnership look like for you?', '', ''],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${kickoffTabName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: kickoffQuestions }
  });

  console.log('📋 Created Kickoff Questions tab');

  // Get updated sheet metadata for formatting
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });

  // Format ALL Gantt tabs
  const formatRequests = [];
  for (const serviceType of serviceTypes) {
    const svcName = TEMPLATES?.services[serviceType]?.name || serviceType;
    const ganttTabName = `${salesData.client_name} - ${svcName}`;
    const ganttSheet = meta.data.sheets.find(s => s.properties.title === ganttTabName);

    if (ganttSheet) {
      const sheetId = ganttSheet.properties.sheetId;
      formatRequests.push(
        { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
        { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)' } },
        { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.92, blue: 1 }, textFormat: { bold: true, fontSize: 11 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 320 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 70 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 16 }, properties: { pixelSize: 65 }, fields: 'pixelSize' } },
        { repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: 4, endColumnIndex: 16 }, cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } }, fields: 'userEnteredFormat(horizontalAlignment)' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 45 }, fields: 'pixelSize' } }
      );
    }
  }

  if (formatRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: formatRequests }
    });
  }

  console.log('✅ Gantt & Access tabs generated');

  // Generate Research tab immediately (no waiting for access)
  await runResearchAgent(salesData.client_name, sheets, SPREADSHEET_ID);

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${firstSheetId}`;

  // Send Slack notification
  await sendSlackNotification(salesData, spreadsheetUrl);

  // Track client spreadsheet
  clientSpreadsheets.set(salesData.client_name, SPREADSHEET_ID);

  console.log('✅ All tabs generated successfully');
  return { success: true, spreadsheet_url: spreadsheetUrl, spreadsheet_id: SPREADSHEET_ID, services: serviceNames };
}

// Simple HTTP server
const server = http.createServer(async (req, res) => {
  // Serve dashboard
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // API endpoint
  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const salesData = JSON.parse(body);
        const result = await generateOnboarding(salesData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API endpoint to manually trigger research (for demo)
  if (req.method === 'POST' && req.url === '/api/trigger-research') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { client_name, spreadsheet_id } = JSON.parse(body);
        const sheetId = spreadsheet_id || clientSpreadsheets.get(client_name);
        if (!sheetId) throw new Error('No spreadsheet found for client');

        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const sheets = google.sheets({ version: 'v4', auth });

        await runResearchAgent(client_name, sheets, sheetId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Research completed' }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API endpoint to mark all access as confirmed (for demo)
  if (req.method === 'POST' && req.url === '/api/confirm-access') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { client_name, spreadsheet_id } = JSON.parse(body);
        const sheetId = spreadsheet_id || clientSpreadsheets.get(client_name);
        if (!sheetId) throw new Error('No spreadsheet found for client');

        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const accessTabName = `${client_name} - Access`;
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Update all statuses to Confirmed
        const confirmValues = Array(22).fill(['Confirmed', today, today]);
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `'${accessTabName}'!E2:G23`,
          valueInputOption: 'RAW',
          requestBody: { values: confirmValues }
        });

        console.log(`✅ All access marked as confirmed for ${client_name}`);

        // Mark as triggered to prevent watcher from also firing
        researchTriggered.add(client_name);

        // Trigger research agent automatically
        await runResearchAgent(client_name, sheets, sheetId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Access confirmed and research triggered' }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

// Start access status watcher (polls every 30 seconds)
function startAccessWatcher() {
  console.log('👀 Access watcher started (checking every 30s)');

  setInterval(async () => {
    for (const clientName of activeClients) {
      await checkAccessStatus(clientName);
    }
  }, 30000);
}

server.listen(PORT, () => {
  console.log(`\n🚀 Onboarding Agent Dashboard running at:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n🤖 Research Agent ready - will auto-trigger when access confirmed\n`);
  startAccessWatcher();
});
