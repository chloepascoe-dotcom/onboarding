// Fetch emails from Gmail API
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const accessToken = authHeader.split(' ')[1];
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get date range from query params
    const { startDate, endDate } = req.query;
    const afterDate = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const beforeDate = endDate ? new Date(endDate) : new Date();

    // Format dates for Gmail query
    const afterStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');
    const beforeStr = beforeDate.toISOString().split('T')[0].replace(/-/g, '/');

    // Fetch emails
    const query = `after:${afterStr} before:${beforeStr}`;
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 200
    });

    const messages = messagesResponse.data.messages || [];

    // Fetch full details for each message (in batches)
    const emails = [];
    const batchSize = 50;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const details = await Promise.all(
        batch.map(async (msg) => {
          try {
            const detail = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'metadata',
              metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Reply-To']
            });

            const headers = detail.data.payload.headers;
            const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

            // Get snippet (preview)
            const snippet = detail.data.snippet || '';

            // Parse labels
            const labels = detail.data.labelIds || [];

            return {
              id: msg.id,
              threadId: msg.threadId,
              from: getHeader('From'),
              to: getHeader('To'),
              subject: getHeader('Subject'),
              date: getHeader('Date'),
              snippet: snippet,
              labels: labels,
              isUnread: labels.includes('UNREAD'),
              isImportant: labels.includes('IMPORTANT'),
              isSpam: labels.includes('SPAM'),
              isPromo: labels.includes('CATEGORY_PROMOTIONS'),
              isSocial: labels.includes('CATEGORY_SOCIAL'),
              isUpdate: labels.includes('CATEGORY_UPDATES'),
              isForum: labels.includes('CATEGORY_FORUMS')
            };
          } catch (err) {
            console.error(`Error fetching message ${msg.id}:`, err.message);
            return null;
          }
        })
      );

      emails.push(...details.filter(d => d !== null));
    }

    // Basic categorization
    const categorized = categorizeEmails(emails);

    res.json({
      success: true,
      dateRange: { start: afterStr, end: beforeStr },
      total: emails.length,
      emails: emails,
      categories: categorized
    });

  } catch (err) {
    console.error('Error fetching emails:', err);
    res.status(500).json({
      error: err.message,
      details: err.response?.data || null
    });
  }
};

// Basic email categorization
function categorizeEmails(emails) {
  const spam = [];
  const promotions = [];
  const automated = [];
  const actionable = [];

  // Known automated senders
  const automatedPatterns = [
    /noreply@/i, /no-reply@/i, /notifications@/i, /alerts@/i,
    /calendar-notification@google/i, /drive-shares-dm-noreply@google/i,
    /@github.com/i, /@slack.com/i, /@asana.com/i, /@figma.com/i,
    /@notion.so/i, /@loom.com/i, /@calendly.com/i, /@zoom.us/i
  ];

  // Known promotional patterns
  const promoPatterns = [
    /marketing@/i, /newsletter@/i, /updates@/i, /news@/i,
    /digest@/i, /weekly@/i, /promo@/i, /offers@/i
  ];

  emails.forEach(email => {
    const from = email.from.toLowerCase();

    if (email.isSpam) {
      spam.push(email);
    } else if (email.isPromo || promoPatterns.some(p => p.test(from))) {
      promotions.push(email);
    } else if (automatedPatterns.some(p => p.test(from)) || email.isUpdate) {
      automated.push(email);
    } else {
      actionable.push(email);
    }
  });

  return {
    spam: spam,
    promotions: promotions,
    automated: automated,
    actionable: actionable,
    stats: {
      total: emails.length,
      spam: spam.length,
      promotions: promotions.length,
      automated: automated.length,
      actionable: actionable.length
    }
  };
}
