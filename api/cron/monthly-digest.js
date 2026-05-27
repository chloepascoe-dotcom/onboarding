// Monthly Feedback Digest Cron Job
// Runs on the 1st of every month at 9am UTC
// Sends aggregated feedback summary to Slack

const { google } = require('googleapis');

const SHARED_DRIVE_FOLDER_ID = process.env.SHARED_DRIVE_FOLDER_ID || '1_a4DqDQ7M7NnA87gJbPJj0UUgydEPAX_';
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly']
  });
}

module.exports = async (req, res) => {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow manual triggers without secret for testing
    if (req.method !== 'GET') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // Get sheets from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const fileList = await drive.files.list({
      q: `'${SHARED_DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and createdTime > '${thirtyDaysAgo.toISOString()}'`,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 50
    });

    const feedbackSummary = {
      totalSheets: fileList.data.files.length,
      withFeedback: 0,
      missingTasks: [],
      unnecessaryTasks: [],
      frictionPoints: [],
      positives: [],
      ratings: []
    };

    for (const file of fileList.data.files) {
      try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: file.id });
        const feedbackSheet = meta.data.sheets.find(s => s.properties.title.includes('Feedback'));
        if (!feedbackSheet) continue;

        const feedbackData = await sheets.spreadsheets.values.get({
          spreadsheetId: file.id,
          range: `'${feedbackSheet.properties.title}'!A1:B60`
        });

        const rows = feedbackData.data.values || [];
        let hasFeedback = false;

        for (const row of rows) {
          const question = (row[0] || '').trim();
          const answer = (row[1] || '').trim();
          if (!answer) continue;

          hasFeedback = true;
          const clientName = file.name.replace('Onboarding - ', '').replace(/ \(.*\)$/, '');

          if (question.includes('MISSING')) {
            feedbackSummary.missingTasks.push({ client: clientName, feedback: answer });
          } else if (question.includes('UNNECESSARY')) {
            feedbackSummary.unnecessaryTasks.push({ client: clientName, feedback: answer });
          } else if (question.includes('friction')) {
            feedbackSummary.frictionPoints.push({ client: clientName, feedback: answer });
          } else if (question.includes('worked really well')) {
            feedbackSummary.positives.push({ client: clientName, feedback: answer });
          } else if (question.includes('1-10')) {
            feedbackSummary.ratings.push({ client: clientName, rating: answer });
          }
        }

        if (hasFeedback) feedbackSummary.withFeedback++;
      } catch (e) {
        // Skip files with errors
      }
    }

    // Calculate average rating
    const numericRatings = feedbackSummary.ratings
      .map(r => parseFloat(r.rating))
      .filter(r => !isNaN(r));
    const avgRating = numericRatings.length > 0
      ? (numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length).toFixed(1)
      : 'N/A';

    // Send to Slack
    if (SLACK_WEBHOOK) {
      const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const blocks = [
        { type: "header", text: { type: "plain_text", text: `Monthly Onboarding Feedback - ${month}` } },
        { type: "section", fields: [
          { type: "mrkdwn", text: `*Onboardings this month:* ${feedbackSummary.totalSheets}` },
          { type: "mrkdwn", text: `*With feedback:* ${feedbackSummary.withFeedback}` },
          { type: "mrkdwn", text: `*Avg rating:* ${avgRating}/10` }
        ]}
      ];

      if (feedbackSummary.missingTasks.length > 0) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: `*Tasks people said were MISSING:*\n${feedbackSummary.missingTasks.slice(0, 3).map(t => `• ${t.client}: ${t.feedback}`).join('\n')}` }
        });
      }

      if (feedbackSummary.frictionPoints.length > 0) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: `*Friction points:*\n${feedbackSummary.frictionPoints.slice(0, 3).map(t => `• ${t.client}: ${t.feedback}`).join('\n')}` }
        });
      }

      if (feedbackSummary.positives.length > 0) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: `*What worked well:*\n${feedbackSummary.positives.slice(0, 3).map(t => `• ${t.client}: ${t.feedback}`).join('\n')}` }
        });
      }

      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: "_Review full digest and update templates as needed._" }
      });

      await fetch(SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks })
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Monthly digest sent to Slack',
      summary: feedbackSummary,
      avgRating
    });

  } catch (err) {
    console.error('Monthly digest cron error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
