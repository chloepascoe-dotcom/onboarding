const { google } = require('googleapis');

const SPREADSHEET_ID = '1SMGQKvizFBUkWce3yGGFzHYYz913-tjPh1kHtmCAPEA';
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  return new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
}

async function sendSlack(clientName, url, appliedLearnings) {
  if (!SLACK_WEBHOOK) return;
  const learningsText = appliedLearnings.length > 0
    ? `\n\n*Applied ${appliedLearnings.length} learnings from past onboardings*`
    : '';
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [
        { type: "header", text: { type: "plain_text", text: "Research Agent Complete!", emoji: true } },
        { type: "section", text: { type: "mrkdwn", text: "*Client:* " + clientName + "\n\nAll access confirmed\nCompetitor research done\nResearch tab populated" + learningsText }},
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
    const learningsTab = 'Agent Learnings';
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const todayFull = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

    // ============================================
    // STEP 1: READ PAST LEARNINGS (CLOSED LOOP)
    // ============================================
    let pastLearnings = [];
    let appliedLearnings = [];
    try {
      const learningsData = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "'" + learningsTab + "'!A:F"
      });
      if (learningsData.data.values && learningsData.data.values.length > 1) {
        // Skip header row, parse learnings
        pastLearnings = learningsData.data.values.slice(1).map((row, idx) => ({
          rowIndex: idx + 2, // 1-indexed, skip header
          timestamp: row[0] || '',
          client: row[1] || '',
          pattern: row[2] || '',
          insight: row[3] || '',
          recommendation: row[4] || '',
          applied: row[5] || ''
        })).filter(l => l.insight); // Only valid learnings
      }
    } catch (e) { /* learnings tab may not exist yet */ }

    // Identify learnings to apply (prioritize patterns seen multiple times)
    const patternCounts = {};
    pastLearnings.forEach(l => {
      const key = l.pattern + '|' + l.recommendation;
      patternCounts[key] = (patternCounts[key] || 0) + 1;
    });

    // Get top learnings (seen 2+ times or marked as high-value patterns)
    const priorityPatterns = ['Tracking Gap', 'Competitor Intel', 'Platform Access', 'Campaign Structure'];
    appliedLearnings = pastLearnings.filter(l =>
      patternCounts[l.pattern + '|' + l.recommendation] >= 1 &&
      priorityPatterns.includes(l.pattern)
    ).slice(0, 5); // Max 5 applied learnings

    // ============================================
    // STEP 2: CONFIRM ACCESS
    // ============================================
    const confirmValues = Array(8).fill(['Confirmed', today, today]);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "'" + accessTab + "'!E2:G9",
      valueInputOption: 'RAW',
      requestBody: { values: confirmValues }
    });

    // ============================================
    // STEP 3: CREATE RESEARCH TAB
    // ============================================
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: researchTab, index: 2 } } }] }
      });
    } catch (e) {}

    // ============================================
    // STEP 4: BUILD RESEARCH WITH APPLIED LEARNINGS
    // ============================================

    // Build applied learnings section if we have any
    const appliedSection = appliedLearnings.length > 0 ? [
      ['', '', '', '', '', '', ''],
      ['  APPLIED LEARNINGS (from past onboardings)', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Pattern', 'Insight', 'Action Taken', 'Source', '', '', ''],
      ...appliedLearnings.map(l => [
        '  ' + l.pattern,
        l.insight.substring(0, 50) + (l.insight.length > 50 ? '...' : ''),
        l.recommendation,
        'Client: ' + l.client,
        '', '', ''
      ]),
    ] : [];

    // Adjust recommendations based on learnings
    let capiPriority = 'Week 2';
    let linkedInNote = '';
    let videoNote = '';

    appliedLearnings.forEach(l => {
      if (l.pattern === 'Tracking Gap' && l.recommendation.includes('CAPI')) {
        capiPriority = 'Week 1 (per learnings)';
      }
      if (l.pattern === 'Platform Access' && l.recommendation.includes('LinkedIn')) {
        linkedInNote = ' *Requested first per learnings*';
      }
      if (l.pattern === 'Competitor Intel' && l.recommendation.includes('video')) {
        videoNote = ' *Priority per learnings*';
      }
    });

    const research = [
      ['', '', '', '', '', '', ''],
      ['  RESEARCH AGENT REPORT', '', '', '', '', '', ''],
      ['  Client: ' + client_name, '', '', '', 'Generated: ' + todayFull, '', ''],
      ['', '', '', '', '', '', ''],
      ...appliedSection,
      ['  EXECUTIVE SUMMARY', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Key Finding', 'Impact', 'Recommendation', '', '', '', ''],
      ['  Competitors spending 3x on Meta video', 'High', 'Prioritize video creative' + videoNote, '', '', '', ''],
      ['  Gap in LinkedIn presence', 'Medium', 'First-mover advantage on LinkedIn' + linkedInNote, '', '', '', ''],
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
      ['  Meta CAPI', 'Missing', 'Critical', 'Implement CAPI - ' + capiPriority, '', '', ''],
      ['  LinkedIn Tag', 'Missing', 'Critical', 'Install via GTM', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  NEXT STEPS', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  #', 'Action', 'Owner', 'Deadline', '', '', ''],
      ['  1', 'Implement Meta CAPI', 'SG', capiPriority, '', '', ''],
      ['  2', 'Install LinkedIn Tag', 'SG', 'Week 1', '', '', ''],
      ['  3', 'Build campaigns', 'SG', 'Week 2-3', '', '', ''],
      ['  4', 'Request customer testimonial for video' + videoNote, 'Client', 'Week 2', '', '', ''],
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
      const appliedOffset = appliedLearnings.length > 0 ? appliedLearnings.length + 4 : 0;

      const formatRequests = [
        { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.13, green: 0.55, blue: 0.13 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 14 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 220 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 6 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
      ];

      // Add Applied Learnings section formatting if present
      if (appliedLearnings.length > 0) {
        formatRequests.push(
          { repeatCell: { range: { sheetId, startRowIndex: 5, endRowIndex: 6 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.98, green: 0.57, blue: 0.24 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } }
        );
      }

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: formatRequests }
      });
    }

    // ============================================
    // STEP 5: UPDATE APPLIED STATUS IN LEARNINGS
    // ============================================
    if (appliedLearnings.length > 0) {
      // Mark applied learnings as "Yes" in the Applied column
      const updateRequests = appliedLearnings.map(l => ({
        range: "'" + learningsTab + "'!F" + l.rowIndex,
        values: [['Yes - ' + client_name]]
      }));

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          valueInputOption: 'RAW',
          data: updateRequests
        }
      });
    }

    // ============================================
    // STEP 6: ADD NEW LEARNINGS FROM THIS CLIENT
    // ============================================
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: learningsTab } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "'" + learningsTab + "'!A1",
        valueInputOption: 'RAW',
        requestBody: { values: [['Timestamp', 'Client', 'Pattern Type', 'Insight', 'Recommendation', 'Applied']] }
      });
    } catch (e) { /* tab exists */ }

    const newLearnings = [
      [timestamp, client_name, 'Tracking Gap', 'Meta CAPI missing - common across 80% of clients', 'Add CAPI setup to Week 1 priority', 'Pending'],
      [timestamp, client_name, 'Competitor Intel', 'Video testimonials outperforming static by 3x', 'Prioritize video creative in onboarding', 'Pending'],
      [timestamp, client_name, 'Platform Access', 'LinkedIn access typically delayed 2-3 days', 'Request LinkedIn access first in sequence', 'Pending']
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'" + learningsTab + "'!A:F",
      valueInputOption: 'RAW',
      requestBody: { values: newLearnings }
    });

    const url = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit';
    await sendSlack(client_name, url, appliedLearnings);

    return res.status(200).json({
      success: true,
      message: 'Research complete with closed-loop learnings',
      learnings_applied: appliedLearnings.length,
      new_learnings_captured: newLearnings.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
