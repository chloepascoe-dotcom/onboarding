// Mock Data for OOO Debrief Dashboard
// This simulates what would come from Gmail API

const mockData = {
  // Date range
  oooStart: '2026-04-07',
  oooEnd: '2026-04-11',

  // Summary stats
  stats: {
    total: 147,
    actionable: 52,
    spam: 68,
    automated: 27
  },

  // Email volume by day
  emailsByDay: [
    { date: 'Mon 4/7', count: 28 },
    { date: 'Tue 4/8', count: 35 },
    { date: 'Wed 4/9', count: 42 },
    { date: 'Thu 4/10', count: 31 },
    { date: 'Fri 4/11', count: 11 }
  ],

  // Red flags - critical items
  redFlags: [
    {
      id: 1,
      type: 'Contract Threat',
      from: 'Zach Grove (Nextiva)',
      email: 'zach.grove@nextiva.com',
      subject: 'RE: Campaign Performance - Need to Talk',
      time: 'Fri 4/11 • 10:23 AM',
      preview: 'If we don\'t see significant improvement by end of week, we need to discuss contract options. I\'ve been patient but the results aren\'t there. Let\'s schedule a call Monday.',
      reason: 'Contains contract/cancellation language'
    },
    {
      id: 2,
      type: 'Escalation',
      from: 'Sarah Mitchell (VP Marketing, Greenwave)',
      email: 's.mitchell@greenwave.com',
      subject: 'FW: Disappointed with Results - Escalating',
      time: 'Thu 4/10 • 4:15 PM',
      preview: 'I\'m forwarding the below from our CEO. He\'s asking why we\'re still paying for services that aren\'t delivering. Can we get someone senior on a call this week?',
      reason: 'Escalated to VP level, CEO mentioned'
    },
    {
      id: 3,
      type: 'Urgent Request',
      from: 'Sabrina Torres',
      email: 'sabrina@agency.com',
      subject: 'URGENT: Need your input on Greenwave response',
      time: 'Fri 4/11 • 9:02 AM',
      preview: 'Hey - the client is asking for a meeting today and I need to know how you want to handle this. They\'re threatening to cancel. Can you call me when you\'re back?',
      reason: 'Marked urgent, internal escalation'
    }
  ],

  // Prioritized action items
  priorities: [
    {
      id: 1,
      priority: 1,
      subject: 'Respond to Zach Grove re: Nextiva contract concerns',
      from: 'Zach Grove',
      time: 'Fri 4/11',
      reason: 'Client retention risk'
    },
    {
      id: 2,
      priority: 1,
      subject: 'Call Sabrina re: Greenwave escalation',
      from: 'Sabrina Torres',
      time: 'Fri 4/11',
      reason: 'Internal urgent'
    },
    {
      id: 3,
      priority: 2,
      subject: 'Review and approve Q2 budget allocations',
      from: 'Finance Team',
      time: 'Thu 4/10',
      reason: 'Deadline: Mon 4/14'
    },
    {
      id: 4,
      priority: 2,
      subject: 'Provide feedback on new hire interview',
      from: 'HR - Jessica',
      time: 'Wed 4/9',
      reason: 'Candidate waiting'
    },
    {
      id: 5,
      priority: 3,
      subject: 'Sign off on Bolt campaign creative',
      from: 'Creative Team',
      time: 'Tue 4/8',
      reason: 'Launch blocked'
    },
    {
      id: 6,
      priority: 3,
      subject: 'Review monthly performance report',
      from: 'Analytics Team',
      time: 'Mon 4/7',
      reason: 'Client meeting Tue'
    },
    {
      id: 7,
      priority: 4,
      subject: 'Reschedule 1:1 with Sonia',
      from: 'Sonia Martinez',
      time: 'Mon 4/7',
      reason: 'Missed while OOO'
    },
    {
      id: 8,
      priority: 4,
      subject: 'Review updated SOW from legal',
      from: 'Legal Team',
      time: 'Tue 4/8',
      reason: 'Non-urgent review'
    }
  ],

  // Real/actionable emails
  realEmails: [
    { from: 'Zach Grove', subject: 'RE: Campaign Performance - Need to Talk' },
    { from: 'Sarah Mitchell', subject: 'FW: Disappointed with Results - Escalating' },
    { from: 'Sabrina Torres', subject: 'URGENT: Need your input on Greenwave response' },
    { from: 'Finance Team', subject: 'Q2 Budget Allocations - Approval Needed' },
    { from: 'HR - Jessica', subject: 'Interview Feedback Request: Senior Strategist' },
    { from: 'Creative Team', subject: 'Bolt Campaign Creative - Ready for Review' },
    { from: 'Analytics Team', subject: 'March Performance Report Attached' },
    { from: 'Sonia Martinez', subject: 'Quick question about Nextiva targeting' },
    { from: 'Legal Team', subject: 'Updated SOW for Review' },
    { from: 'Mark Chen (Bolt)', subject: 'Thanks for the presentation!' },
    { from: 'Client Services', subject: 'New client onboarding: TechFlow' },
    { from: 'Samantha Reed', subject: 'Coverage while you\'re out' },
    { from: 'IT Support', subject: 'Your software access request approved' },
    { from: 'David Park', subject: 'Re: Team lunch next week?' },
    { from: 'Melissa Wong', subject: 'Handoff notes for Greenwave' }
  ],

  // Spam/promotional emails grouped by sender
  spamBySender: [
    { sender: 'LinkedIn', count: 12 },
    { sender: 'HubSpot Blog', count: 8 },
    { sender: 'Salesforce', count: 7 },
    { sender: 'Mailchimp', count: 6 },
    { sender: 'Google Ads Tips', count: 5 },
    { sender: 'Meta for Business', count: 5 },
    { sender: 'Webinar Invites (various)', count: 5 },
    { sender: 'SEMrush', count: 4 },
    { sender: 'Drift', count: 4 },
    { sender: 'ZoomInfo', count: 3 },
    { sender: 'Gong.io', count: 3 },
    { sender: 'Hootsuite', count: 2 },
    { sender: 'Buffer', count: 2 },
    { sender: 'Sprout Social', count: 2 }
  ],

  // Automated/notification emails
  automatedEmails: [
    { from: 'Google Calendar', subject: '5 events while you were away' },
    { from: 'Slack', subject: '47 new messages in #general' },
    { from: 'Asana', subject: '12 tasks updated' },
    { from: 'Figma', subject: 'New comments on "Q2 Campaign Designs"' },
    { from: 'Google Analytics', subject: 'Weekly digest: Traffic summary' },
    { from: 'Meta Business Suite', subject: 'Weekly ad performance summary' },
    { from: 'GitHub', subject: '3 new pull requests' },
    { from: 'Notion', subject: 'Page updates: Team Wiki' },
    { from: 'Loom', subject: '2 new video views' },
    { from: 'Calendly', subject: '3 new bookings' }
  ],

  // Missed meetings
  missedMeetings: [
    {
      date: 'Mon 4/7 • 10:00 AM',
      title: '1:1 with Sonia Martinez',
      attendees: 'Sonia Martinez'
    },
    {
      date: 'Tue 4/8 • 2:00 PM',
      title: 'Greenwave Weekly Sync',
      attendees: 'Greenwave team, Samantha Reed'
    },
    {
      date: 'Wed 4/9 • 11:00 AM',
      title: 'Creative Review - Bolt Campaigns',
      attendees: 'Creative Team, Mark Chen'
    },
    {
      date: 'Thu 4/10 • 3:30 PM',
      title: 'Q2 Planning - Leadership',
      attendees: 'Leadership Team'
    }
  ],

  // Upcoming meetings
  upcomingMeetings: [
    {
      date: 'Mon 4/14 • 9:00 AM',
      title: 'Team Standup',
      attendees: 'All team',
      isToday: true
    },
    {
      date: 'Mon 4/14 • 11:00 AM',
      title: 'Nextiva Strategy Session',
      attendees: 'Sabrina, Sonia, Zach Grove',
      isToday: true
    },
    {
      date: 'Mon 4/14 • 2:00 PM',
      title: 'New Client Kickoff: TechFlow',
      attendees: 'TechFlow team, Sales',
      isToday: true
    },
    {
      date: 'Tue 4/15 • 10:00 AM',
      title: 'Greenwave Check-in',
      attendees: 'Sarah Mitchell, Sabrina'
    },
    {
      date: 'Tue 4/15 • 1:00 PM',
      title: '1:1 with Sonia (rescheduled)',
      attendees: 'Sonia Martinez'
    },
    {
      date: 'Wed 4/16 • 3:00 PM',
      title: 'Q2 Budget Review',
      attendees: 'Finance, Leadership'
    }
  ],

  // Meetings to schedule based on email requests
  meetingsToSchedule: [
    {
      who: 'Zach Grove (Nextiva)',
      reason: 'Requested call to discuss contract concerns and campaign performance',
      source: 'Email: Fri 4/11'
    },
    {
      who: 'Sarah Mitchell (Greenwave VP)',
      reason: 'Escalation - wants senior person on a call to address CEO concerns',
      source: 'Email: Thu 4/10'
    },
    {
      who: 'Jessica (HR)',
      reason: 'Interview debrief for Senior Strategist candidate',
      source: 'Email: Wed 4/9'
    },
    {
      who: 'TechFlow Onboarding',
      reason: 'New client kickoff follow-up and scope review',
      source: 'Email: Tue 4/8'
    },
    {
      who: 'Creative Team',
      reason: 'Bolt campaign creative review (missed Wed meeting)',
      source: 'Missed meeting: Wed 4/9'
    }
  ],

  // Top senders (real emails only)
  topSenders: [
    { name: 'Sabrina Torres', email: 'sabrina@agency.com', count: 8 },
    { name: 'Sonia Martinez', email: 'sonia@agency.com', count: 6 },
    { name: 'Zach Grove', email: 'zach.grove@nextiva.com', count: 5 },
    { name: 'Finance Team', email: 'finance@agency.com', count: 4 },
    { name: 'Creative Team', email: 'creative@agency.com', count: 4 },
    { name: 'Sarah Mitchell', email: 's.mitchell@greenwave.com', count: 3 },
    { name: 'HR - Jessica', email: 'jessica.hr@agency.com', count: 3 },
    { name: 'Samantha Reed', email: 'samantha@agency.com', count: 3 },
    { name: 'Mark Chen (Bolt)', email: 'mark@bolt.io', count: 2 },
    { name: 'Legal Team', email: 'legal@agency.com', count: 2 }
  ]
};
