// Feedback Digest API - Compiles feedback from all onboarding sheets for monthly review
// Claude can call this endpoint to generate improvement recommendations

const { google } = require('googleapis');

const SHARED_DRIVE_FOLDER_ID = process.env.SHARED_DRIVE_FOLDER_ID || '1_a4DqDQ7M7NnA87gJbPJj0UUgydEPAX_';

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly']
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // Get all spreadsheets in the onboarding folder
    const fileList = await drive.files.list({
      q: `'${SHARED_DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.spreadsheet'`,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 100
    });

    const allFeedback = [];
    const errors = [];

    console.log(`Found ${fileList.data.files.length} onboarding sheets`);

    for (const file of fileList.data.files) {
      try {
        // Get sheet metadata to find Feedback tab
        const meta = await sheets.spreadsheets.get({ spreadsheetId: file.id });
        const feedbackSheet = meta.data.sheets.find(s => s.properties.title.includes('Feedback'));

        if (!feedbackSheet) {
          continue; // No feedback tab in this sheet
        }

        const feedbackTabName = feedbackSheet.properties.title;

        // Read feedback data
        const feedbackData = await sheets.spreadsheets.values.get({
          spreadsheetId: file.id,
          range: `'${feedbackTabName}'!A1:B60`
        });

        const rows = feedbackData.data.values || [];

        // Extract client name and feedback responses
        const clientName = file.name.replace('Onboarding - ', '').replace(/ \(.*\)$/, '');
        const createdDate = new Date(file.createdTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const feedback = {
          client: clientName,
          created: createdDate,
          spreadsheetId: file.id,
          responses: {}
        };

        let currentSection = '';
        let hasAnyFeedback = false;

        for (const row of rows) {
          const col1 = (row[0] || '').trim();
          const col2 = (row[1] || '').trim();

          // Detect section headers
          if (['TASKS & TIMELINE', 'ACCESS & SETUP', 'KICKOFF & DISCOVERY', 'RESEARCH REPORT', 'OVERALL'].includes(col1)) {
            currentSection = col1;
            feedback.responses[currentSection] = {};
            continue;
          }

          // Skip non-question rows
          if (!col1 || col1 === 'Question' || col1.startsWith('Please') || col1.startsWith('Your input')) {
            continue;
          }

          // Capture responses (only if there's actual content in col2)
          if (currentSection && col2 && col2.length > 0) {
            feedback.responses[currentSection][col1] = col2;
            hasAnyFeedback = true;
          }
        }

        // Only include sheets that have actual feedback
        if (hasAnyFeedback) {
          allFeedback.push(feedback);
        }

      } catch (err) {
        errors.push({ file: file.name, error: err.message });
      }
    }

    // Generate summary statistics
    const summary = {
      totalSheets: fileList.data.files.length,
      sheetsWithFeedback: allFeedback.length,
      dateRange: {
        oldest: fileList.data.files.length > 0 ? new Date(fileList.data.files[fileList.data.files.length - 1].createdTime).toLocaleDateString() : null,
        newest: fileList.data.files.length > 0 ? new Date(fileList.data.files[0].createdTime).toLocaleDateString() : null
      }
    };

    // Aggregate common feedback themes
    const themes = {
      missingTasks: [],
      unnecessaryTasks: [],
      accessIssues: [],
      kickoffSuggestions: [],
      researchFeedback: [],
      overallRatings: [],
      frictionPoints: [],
      positives: []
    };

    for (const fb of allFeedback) {
      const tasks = fb.responses['TASKS & TIMELINE'] || {};
      const access = fb.responses['ACCESS & SETUP'] || {};
      const kickoff = fb.responses['KICKOFF & DISCOVERY'] || {};
      const research = fb.responses['RESEARCH REPORT'] || {};
      const overall = fb.responses['OVERALL'] || {};

      if (tasks['Were any tasks MISSING that should be added?']) {
        themes.missingTasks.push({ client: fb.client, feedback: tasks['Were any tasks MISSING that should be added?'] });
      }
      if (tasks['Were any tasks UNNECESSARY and should be removed?']) {
        themes.unnecessaryTasks.push({ client: fb.client, feedback: tasks['Were any tasks UNNECESSARY and should be removed?'] });
      }
      if (access['Any issues getting access that we should plan for?']) {
        themes.accessIssues.push({ client: fb.client, feedback: access['Any issues getting access that we should plan for?'] });
      }
      if (kickoff['What questions would you add?']) {
        themes.kickoffSuggestions.push({ client: fb.client, feedback: kickoff['What questions would you add?'] });
      }
      if (research['What would make it more actionable?']) {
        themes.researchFeedback.push({ client: fb.client, feedback: research['What would make it more actionable?'] });
      }
      if (overall['Rate the onboarding experience (1-10)']) {
        themes.overallRatings.push({ client: fb.client, rating: overall['Rate the onboarding experience (1-10)'] });
      }
      if (overall['What was the biggest friction point?']) {
        themes.frictionPoints.push({ client: fb.client, feedback: overall['What was the biggest friction point?'] });
      }
      if (overall['What worked really well?']) {
        themes.positives.push({ client: fb.client, feedback: overall['What worked really well?'] });
      }
    }

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      summary,
      themes,
      detailedFeedback: allFeedback,
      errors: errors.length > 0 ? errors : undefined,
      instructions: `
MONTHLY FEEDBACK DIGEST - Instructions for Claude:

1. Review the 'themes' section to identify patterns across clients
2. For each theme with 2+ mentions, consider a template change
3. Calculate average rating from 'overallRatings'
4. Prioritize changes based on:
   - Frequency of mention
   - Impact on onboarding success
   - Ease of implementation

5. Generate recommendations in this format:
   - TEMPLATE CHANGES: specific modifications to make
   - PROCESS CHANGES: workflow improvements
   - KEEP DOING: things that work well

6. After generating recommendations, the user can update the master templates.
      `.trim()
    });

  } catch (err) {
    console.error('Feedback digest error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
