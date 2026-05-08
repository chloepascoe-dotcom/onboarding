// Fetch Slack messages and activity
// Note: Requires Slack OAuth setup similar to Google

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No Slack token provided' });
    }

    const slackToken = authHeader.split(' ')[1];
    const { startDate, endDate } = req.query;

    // Convert dates to Unix timestamps
    const oldest = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const latest = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : Math.floor(Date.now() / 1000);

    // Fetch conversations list
    const conversationsRes = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel,mpim,im&limit=100', {
      headers: { 'Authorization': `Bearer ${slackToken}` }
    });
    const conversationsData = await conversationsRes.json();

    if (!conversationsData.ok) {
      throw new Error(conversationsData.error || 'Failed to fetch Slack conversations');
    }

    const channels = conversationsData.channels || [];

    // Get unread counts and messages for each channel
    const channelStats = await Promise.all(
      channels.slice(0, 30).map(async (channel) => {
        try {
          // Get conversation history
          const historyRes = await fetch(
            `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${oldest}&latest=${latest}&limit=100`,
            { headers: { 'Authorization': `Bearer ${slackToken}` } }
          );
          const historyData = await historyRes.json();

          const messages = historyData.messages || [];

          // Check for mentions (@user) and urgent keywords
          const mentions = messages.filter(m => m.text && m.text.includes('<@')).length;
          const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'important', 'need you'];
          const urgentMessages = messages.filter(m =>
            m.text && urgentKeywords.some(k => m.text.toLowerCase().includes(k))
          );

          return {
            id: channel.id,
            name: channel.name || channel.user || 'DM',
            type: channel.is_im ? 'dm' : channel.is_mpim ? 'group_dm' : 'channel',
            messageCount: messages.length,
            mentions: mentions,
            urgentCount: urgentMessages.length,
            urgentMessages: urgentMessages.slice(0, 5).map(m => ({
              text: m.text?.substring(0, 200),
              user: m.user,
              ts: m.ts
            }))
          };
        } catch (err) {
          return {
            id: channel.id,
            name: channel.name || 'Unknown',
            messageCount: 0,
            error: err.message
          };
        }
      })
    );

    // Calculate totals
    const totalMessages = channelStats.reduce((sum, c) => sum + (c.messageCount || 0), 0);
    const totalMentions = channelStats.reduce((sum, c) => sum + (c.mentions || 0), 0);
    const totalUrgent = channelStats.reduce((sum, c) => sum + (c.urgentCount || 0), 0);

    // Sort channels by message count
    const sortedChannels = channelStats
      .filter(c => c.messageCount > 0)
      .sort((a, b) => b.messageCount - a.messageCount);

    // Get urgent channels
    const urgentChannels = channelStats
      .filter(c => c.urgentCount > 0)
      .sort((a, b) => b.urgentCount - a.urgentCount);

    res.json({
      success: true,
      stats: {
        totalMessages,
        totalMentions,
        totalUrgent,
        channelsWithActivity: sortedChannels.length
      },
      channels: sortedChannels.slice(0, 15),
      urgentChannels: urgentChannels,
      allUrgentMessages: urgentChannels.flatMap(c => c.urgentMessages || [])
    });

  } catch (err) {
    console.error('Slack fetch error:', err);
    res.status(500).json({
      error: err.message
    });
  }
};
