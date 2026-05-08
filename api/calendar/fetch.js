// Fetch calendar events from Google Calendar API
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get date range from query params
    const { startDate, endDate } = req.query;
    const oooStart = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oooEnd = endDate ? new Date(endDate) : new Date();

    // Fetch events during OOO period (missed meetings)
    const missedEventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: oooStart.toISOString(),
      timeMax: oooEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50
    });

    // Fetch upcoming events (next 7 days)
    const upcomingStart = new Date();
    const upcomingEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const upcomingEventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: upcomingStart.toISOString(),
      timeMax: upcomingEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50
    });

    // Format events
    const formatEvent = (event) => {
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;

      return {
        id: event.id,
        title: event.summary || '(No title)',
        start: start,
        end: end,
        attendees: (event.attendees || []).map(a => ({
          email: a.email,
          name: a.displayName || a.email,
          responseStatus: a.responseStatus
        })),
        organizer: event.organizer?.email,
        location: event.location || null,
        description: event.description || null,
        link: event.hangoutLink || event.htmlLink,
        isAllDay: !event.start.dateTime
      };
    };

    const missedEvents = (missedEventsResponse.data.items || [])
      .filter(e => e.status !== 'cancelled')
      .map(formatEvent);

    const upcomingEvents = (upcomingEventsResponse.data.items || [])
      .filter(e => e.status !== 'cancelled')
      .map(formatEvent);

    // Identify today's events
    const today = new Date().toDateString();
    upcomingEvents.forEach(event => {
      event.isToday = new Date(event.start).toDateString() === today;
    });

    res.json({
      success: true,
      missed: missedEvents,
      upcoming: upcomingEvents,
      stats: {
        missedCount: missedEvents.length,
        upcomingCount: upcomingEvents.length,
        todayCount: upcomingEvents.filter(e => e.isToday).length
      }
    });

  } catch (err) {
    console.error('Calendar fetch error:', err);
    res.status(500).json({
      error: err.message,
      details: err.response?.data || null
    });
  }
};
