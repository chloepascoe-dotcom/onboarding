// OOO Debrief Dashboard - Main Application

// State
let authData = null;
let emailData = null;
let analysisData = null;
let calendarData = null;
let slackData = null;
let isDemo = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initNavigation();
  setDefaultDates();
});

// Check for auth token in URL or localStorage
function checkAuth() {
  const urlParams = new URLSearchParams(window.location.search);

  // Check for auth callback
  const authParam = urlParams.get('auth');
  if (authParam) {
    try {
      authData = JSON.parse(atob(authParam));
      localStorage.setItem('ooo_auth', JSON.stringify(authData));
      // Clean URL
      window.history.replaceState({}, '', '/');
      startDataFetch();
      return;
    } catch (e) {
      console.error('Failed to parse auth:', e);
    }
  }

  // Check for error
  const error = urlParams.get('error');
  if (error) {
    alert('Login failed: ' + error);
    window.history.replaceState({}, '', '/');
  }

  // Check localStorage
  const stored = localStorage.getItem('ooo_auth');
  if (stored) {
    try {
      authData = JSON.parse(stored);
      startDataFetch();
      return;
    } catch (e) {
      localStorage.removeItem('ooo_auth');
    }
  }

  // Show login screen
  showScreen('login');
}

// Screen management
function showScreen(screen) {
  document.getElementById('loginScreen').style.display = screen === 'login' ? 'flex' : 'none';
  document.getElementById('loadingScreen').style.display = screen === 'loading' ? 'flex' : 'none';
  document.getElementById('mainApp').style.display = screen === 'app' ? 'flex' : 'none';
}

// Set default dates (last 5 weekdays)
function setDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  document.getElementById('startDate').value = start.toISOString().split('T')[0];
  document.getElementById('endDate').value = end.toISOString().split('T')[0];
}

// Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      const sectionId = item.getAttribute('data-section');
      document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(sectionId).classList.add('active');
    });
  });
}

// Google Login
function startGoogleLogin() {
  window.location.href = '/api/auth/login';
}

// Logout
function logout() {
  localStorage.removeItem('ooo_auth');
  authData = null;
  isDemo = false;
  showScreen('login');
}

// Load demo data
function loadDemoData() {
  isDemo = true;
  showScreen('loading');
  updateLoadingStep(1, 'active');

  // Simulate loading
  setTimeout(() => {
    updateLoadingStep(1, 'complete');
    updateLoadingStep(2, 'active');
  }, 500);

  setTimeout(() => {
    updateLoadingStep(2, 'complete');
    updateLoadingStep(3, 'active');
  }, 1000);

  setTimeout(() => {
    updateLoadingStep(3, 'complete');
    updateLoadingStep(4, 'active');
  }, 1500);

  setTimeout(() => {
    updateLoadingStep(4, 'complete');
    renderDemoData();
    showScreen('app');
  }, 2000);
}

// Update loading step UI
function updateLoadingStep(step, state) {
  const stepEl = document.getElementById('step' + step);
  if (stepEl) {
    stepEl.className = 'loading-step ' + state;
    if (state === 'complete') {
      stepEl.querySelector('.step-icon').textContent = '✓';
    } else if (state === 'active') {
      stepEl.querySelector('.step-icon').textContent = '●';
    }
  }
}

// Start fetching real data
async function startDataFetch() {
  showScreen('loading');
  document.getElementById('loadingTitle').textContent = 'Analyzing your inbox...';

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  try {
    // Step 1: Fetch emails
    updateLoadingStep(1, 'active');
    emailData = await fetchEmails(startDate, endDate);
    updateLoadingStep(1, 'complete');

    // Step 2: Categorize (already done in fetch)
    updateLoadingStep(2, 'active');
    await new Promise(r => setTimeout(r, 300));
    updateLoadingStep(2, 'complete');

    // Step 3: AI Analysis
    updateLoadingStep(3, 'active');
    analysisData = await analyzeEmails(emailData);
    updateLoadingStep(3, 'complete');

    // Step 4: Calendar
    updateLoadingStep(4, 'active');
    calendarData = await fetchCalendar(startDate, endDate);
    updateLoadingStep(4, 'complete');

    // Render
    renderRealData();
    showScreen('app');

    // Update user info
    if (authData?.user) {
      document.getElementById('userName').textContent = ', ' + authData.user.name.split(' ')[0];
      document.getElementById('userAvatar').src = authData.user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(authData.user.name)}&background=2d9a9a&color=fff`;
    }

  } catch (err) {
    console.error('Data fetch error:', err);
    alert('Failed to fetch data: ' + err.message + '\n\nLoading demo data instead.');
    loadDemoData();
  }
}

// API calls
async function fetchEmails(startDate, endDate) {
  const res = await fetch(`/api/emails/fetch?startDate=${startDate}&endDate=${endDate}`, {
    headers: { 'Authorization': `Bearer ${authData.access_token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch emails');
  return res.json();
}

async function analyzeEmails(emailData) {
  const res = await fetch('/api/emails/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.access_token}`
    },
    body: JSON.stringify({
      emails: emailData.emails,
      categories: emailData.categories
    })
  });
  if (!res.ok) throw new Error('Failed to analyze emails');
  return res.json();
}

async function fetchCalendar(startDate, endDate) {
  const res = await fetch(`/api/calendar/fetch?startDate=${startDate}&endDate=${endDate}`, {
    headers: { 'Authorization': `Bearer ${authData.access_token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch calendar');
  return res.json();
}

// Update date range and re-fetch
async function updateDateRange() {
  if (isDemo) {
    alert('Date range changes are not available in demo mode. Connect your Gmail to use this feature.');
    return;
  }
  await startDataFetch();
}

// Refresh data
async function refreshData() {
  const btn = document.querySelector('.btn-refresh');
  btn.innerHTML = '<span>↻</span> Refreshing...';
  btn.disabled = true;

  if (isDemo) {
    setTimeout(() => {
      btn.innerHTML = '<span>↻</span> Refresh Analysis';
      btn.disabled = false;
    }, 1000);
    return;
  }

  try {
    await startDataFetch();
  } finally {
    btn.innerHTML = '<span>↻</span> Refresh Analysis';
    btn.disabled = false;
  }
}

// Render demo data
function renderDemoData() {
  // Use mockData from data.js
  renderStats(mockData.stats);
  renderTimeline(mockData.emailsByDay);
  renderUrgentList(mockData.redFlags);
  renderRedFlags(mockData.redFlags);
  renderPriorities(mockData.priorities);
  renderEmailBreakdown(mockData);
  renderCalendar(mockData);
  renderSenders(mockData);
  renderSlackDemo();

  // Update red flag count
  document.getElementById('redFlagCount').textContent = mockData.redFlags.length;

  // Show insights
  document.getElementById('keyInsightsText').textContent = 'You have 3 urgent items requiring immediate attention, including a potential contract issue with Nextiva. 18 emails need responses, and you have 12 meetings this week.';
  document.getElementById('insightsBanner').style.display = 'flex';
}

// Render real data
function renderRealData() {
  const stats = emailData.categories?.stats || {
    total: emailData.total,
    actionable: emailData.categories?.actionable?.length || 0,
    spam: (emailData.categories?.spam?.length || 0) + (emailData.categories?.promotions?.length || 0),
    automated: emailData.categories?.automated?.length || 0
  };

  renderStats(stats);

  // Timeline - group by day
  const emailsByDay = groupEmailsByDay(emailData.emails || []);
  renderTimeline(emailsByDay);

  // Red flags from analysis
  const redFlags = analysisData?.analysis?.redFlags || [];
  renderUrgentList(redFlags);
  renderRedFlags(redFlags);
  document.getElementById('redFlagCount').textContent = redFlags.length;

  // Priorities
  const priorities = analysisData?.analysis?.priorities || [];
  renderPriorities(priorities);

  // Email breakdown
  renderRealEmailBreakdown(emailData.categories || {});

  // Calendar
  renderRealCalendar(calendarData);

  // Senders
  renderRealSenders(emailData.categories?.actionable || []);

  // Meetings to schedule from analysis
  const meetingsToSchedule = analysisData?.analysis?.meetingsToSchedule || [];
  renderMeetingsToSchedule(meetingsToSchedule);

  // Quick stats
  document.getElementById('needsResponse').textContent = priorities.filter(p => p.priority <= 2).length;
  document.getElementById('meetingsMissed').textContent = calendarData?.missed?.length || 0;
  document.getElementById('meetingsThisWeek').textContent = calendarData?.upcoming?.length || 0;
  document.getElementById('meetingsToScheduleCount').textContent = meetingsToSchedule.length;

  // Key insights
  if (analysisData?.analysis?.keyInsights) {
    document.getElementById('keyInsightsText').textContent = analysisData.analysis.keyInsights;
    document.getElementById('insightsBanner').style.display = 'flex';
  }
}

// Helper: Group emails by day
function groupEmailsByDay(emails) {
  const groups = {};
  emails.forEach(email => {
    const date = new Date(email.date);
    const dayKey = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    groups[dayKey] = (groups[dayKey] || 0) + 1;
  });

  return Object.entries(groups).map(([date, count]) => ({ date, count }));
}

// Render functions
function renderStats(stats) {
  document.getElementById('totalEmails').textContent = stats.total || 0;
  document.getElementById('realEmails').textContent = stats.actionable || 0;
  document.getElementById('spamEmails').textContent = stats.spam || stats.promotions || 0;
  document.getElementById('automatedEmails').textContent = stats.automated || 0;
}

function renderTimeline(emailsByDay) {
  const container = document.getElementById('timelineChart');
  if (!emailsByDay || emailsByDay.length === 0) {
    container.innerHTML = '<div class="empty-state">No email data for timeline</div>';
    return;
  }

  const maxCount = Math.max(...emailsByDay.map(d => d.count));

  container.innerHTML = emailsByDay.map(day => `
    <div class="timeline-bar">
      <div class="bar-fill" style="height: ${(day.count / maxCount) * 100}%">
        <span class="bar-value">${day.count}</span>
      </div>
      <span class="bar-label">${day.date}</span>
    </div>
  `).join('');
}

function renderUrgentList(redFlags) {
  const container = document.getElementById('urgentList');

  if (!redFlags || redFlags.length === 0) {
    container.innerHTML = '<div class="empty-state">No red flags detected - looking good!</div>';
    return;
  }

  container.innerHTML = redFlags.slice(0, 3).map(flag => `
    <div class="urgent-item">
      <div class="urgent-item-header">
        <span class="urgent-item-from">${flag.email?.from || flag.from || 'Unknown'}</span>
        <span class="urgent-item-time">${flag.email?.date || flag.time || ''}</span>
      </div>
      <div class="urgent-item-subject">${flag.email?.subject || flag.subject || 'No subject'}</div>
      <div class="urgent-item-reason">⚠️ ${flag.reason || flag.type}</div>
    </div>
  `).join('');
}

function renderRedFlags(redFlags) {
  const container = document.getElementById('redFlagsList');

  if (!redFlags || redFlags.length === 0) {
    container.innerHTML = '<div class="empty-state">No red flags detected - looking good!</div>';
    return;
  }

  container.innerHTML = redFlags.map((flag, idx) => `
    <div class="red-flag-card">
      <div class="red-flag-header">
        <span class="red-flag-type">${flag.type || 'Urgent'}</span>
        <span class="red-flag-time">${flag.email?.date || flag.time || ''}</span>
      </div>
      <div class="red-flag-from">${flag.email?.from || flag.from || 'Unknown'}</div>
      <div class="red-flag-subject">${flag.email?.subject || flag.subject || 'No subject'}</div>
      <div class="red-flag-preview">"${flag.email?.snippet || flag.preview || ''}"</div>
      <div class="red-flag-actions">
        <button class="btn btn-primary" onclick="openEmail('${flag.email?.id || idx}')">Open Email</button>
        <button class="btn btn-secondary" onclick="markHandled(this)">Mark as Handled</button>
      </div>
    </div>
  `).join('');
}

function renderPriorities(priorities) {
  const container = document.getElementById('prioritiesList');

  if (!priorities || priorities.length === 0) {
    container.innerHTML = '<div class="empty-state">No prioritized items</div>';
    return;
  }

  container.innerHTML = priorities.map((item, idx) => `
    <div class="priority-item">
      <div class="priority-rank p${item.priority}">${item.priority}</div>
      <div class="priority-content">
        <div class="priority-subject">${item.action || item.email?.subject || item.subject}</div>
        <div class="priority-meta">${item.email?.from || item.from || ''} • ${item.email?.date || item.time || ''}</div>
      </div>
      <span class="priority-reason">${item.reason}</span>
      <input type="checkbox" class="priority-checkbox" onchange="togglePriority(this)">
    </div>
  `).join('');
}

function renderEmailBreakdown(data) {
  // Real emails
  const realContainer = document.getElementById('realEmailsList');
  realContainer.innerHTML = data.realEmails?.slice(0, 20).map(email => `
    <div class="category-item">
      <div class="category-item-from">${email.from}</div>
      <div class="category-item-subject">${email.subject}</div>
    </div>
  `).join('') || '<div class="empty-state">No actionable emails</div>';

  // Spam summary
  const spamContainer = document.getElementById('spamSummary');
  spamContainer.innerHTML = data.spamBySender?.map(spam => `
    <div class="spam-group">
      <span class="spam-sender">${spam.sender}</span>
      <span class="spam-count">${spam.count}</span>
    </div>
  `).join('') || '<div class="empty-state">No spam detected</div>';

  // Automated emails
  const autoContainer = document.getElementById('automatedList');
  autoContainer.innerHTML = data.automatedEmails?.slice(0, 15).map(email => `
    <div class="category-item">
      <div class="category-item-from">${email.from}</div>
      <div class="category-item-subject">${email.subject}</div>
    </div>
  `).join('') || '<div class="empty-state">No automated emails</div>';
}

function renderRealEmailBreakdown(categories) {
  // Actionable
  const realContainer = document.getElementById('realEmailsList');
  realContainer.innerHTML = (categories.actionable || []).slice(0, 20).map(email => `
    <div class="category-item">
      <div class="category-item-from">${extractName(email.from)}</div>
      <div class="category-item-subject">${email.subject || '(No subject)'}</div>
    </div>
  `).join('') || '<div class="empty-state">No actionable emails</div>';

  // Spam/Promo grouped by sender
  const spamAndPromo = [...(categories.spam || []), ...(categories.promotions || [])];
  const spamBySender = groupBySender(spamAndPromo);
  const spamContainer = document.getElementById('spamSummary');
  spamContainer.innerHTML = spamBySender.slice(0, 15).map(item => `
    <div class="spam-group">
      <span class="spam-sender">${item.sender}</span>
      <span class="spam-count">${item.count}</span>
    </div>
  `).join('') || '<div class="empty-state">No spam detected</div>';

  // Automated
  const autoContainer = document.getElementById('automatedList');
  autoContainer.innerHTML = (categories.automated || []).slice(0, 15).map(email => `
    <div class="category-item">
      <div class="category-item-from">${extractName(email.from)}</div>
      <div class="category-item-subject">${email.subject || '(No subject)'}</div>
    </div>
  `).join('') || '<div class="empty-state">No automated emails</div>';
}

function renderCalendar(data) {
  // Missed meetings
  const missedContainer = document.getElementById('missedMeetings');
  missedContainer.innerHTML = data.missedMeetings?.map(meeting => `
    <div class="meeting-item missed">
      <div class="meeting-date">${meeting.date}</div>
      <div class="meeting-title">${meeting.title}</div>
      <div class="meeting-attendees">With: ${meeting.attendees}</div>
    </div>
  `).join('') || '<div class="empty-state">No missed meetings</div>';

  // Upcoming
  const upcomingContainer = document.getElementById('upcomingMeetings');
  upcomingContainer.innerHTML = data.upcomingMeetings?.map(meeting => `
    <div class="meeting-item ${meeting.isToday ? 'today' : ''}">
      <div class="meeting-date">${meeting.date} ${meeting.isToday ? '• TODAY' : ''}</div>
      <div class="meeting-title">${meeting.title}</div>
      <div class="meeting-attendees">With: ${meeting.attendees}</div>
    </div>
  `).join('') || '<div class="empty-state">No upcoming meetings</div>';

  // To schedule
  const scheduleContainer = document.getElementById('meetingsToSchedule');
  scheduleContainer.innerHTML = data.meetingsToSchedule?.map(meeting => `
    <div class="schedule-item">
      <div class="schedule-item-who">${meeting.who}</div>
      <div class="schedule-item-reason">${meeting.reason}</div>
      <div class="schedule-item-source">📧 ${meeting.source}</div>
    </div>
  `).join('') || '<div class="empty-state">No meetings to schedule</div>';

  // Stats
  document.getElementById('meetingsMissed').textContent = data.missedMeetings?.length || 0;
  document.getElementById('meetingsThisWeek').textContent = data.upcomingMeetings?.length || 0;
  document.getElementById('meetingsToScheduleCount').textContent = data.meetingsToSchedule?.length || 0;
}

function renderRealCalendar(data) {
  if (!data) return;

  const missedContainer = document.getElementById('missedMeetings');
  missedContainer.innerHTML = (data.missed || []).map(meeting => `
    <div class="meeting-item missed">
      <div class="meeting-date">${formatDate(meeting.start)}</div>
      <div class="meeting-title">${meeting.title}</div>
      <div class="meeting-attendees">With: ${meeting.attendees?.map(a => a.name || a.email).join(', ') || 'Unknown'}</div>
    </div>
  `).join('') || '<div class="empty-state">No missed meetings</div>';

  const upcomingContainer = document.getElementById('upcomingMeetings');
  upcomingContainer.innerHTML = (data.upcoming || []).map(meeting => `
    <div class="meeting-item ${meeting.isToday ? 'today' : ''}">
      <div class="meeting-date">${formatDate(meeting.start)} ${meeting.isToday ? '• TODAY' : ''}</div>
      <div class="meeting-title">${meeting.title}</div>
      <div class="meeting-attendees">With: ${meeting.attendees?.map(a => a.name || a.email).join(', ') || 'Unknown'}</div>
    </div>
  `).join('') || '<div class="empty-state">No upcoming meetings</div>';
}

function renderMeetingsToSchedule(meetings) {
  const container = document.getElementById('meetingsToSchedule');
  container.innerHTML = meetings.map(m => `
    <div class="schedule-item">
      <div class="schedule-item-who">${m.with}</div>
      <div class="schedule-item-reason">${m.reason}</div>
      <div class="schedule-item-source">📧 From email analysis</div>
    </div>
  `).join('') || '<div class="empty-state">No meetings to schedule detected</div>';
}

function renderSenders(data) {
  const sendersContainer = document.getElementById('topSendersList');
  sendersContainer.innerHTML = data.topSenders?.map((sender, index) => `
    <div class="sender-item">
      <div class="sender-rank">${index + 1}</div>
      <div class="sender-info">
        <div class="sender-name">${sender.name}</div>
        <div class="sender-email">${sender.email}</div>
      </div>
      <div class="sender-count">${sender.count}</div>
    </div>
  `).join('') || '<div class="empty-state">No sender data</div>';

  const spamSendersContainer = document.getElementById('spamSendersList');
  spamSendersContainer.innerHTML = data.spamBySender?.slice(0, 10).map(sender => `
    <div class="spam-sender-item">
      <span class="spam-sender-name">${sender.sender}</span>
      <span class="spam-sender-count">${sender.count} emails</span>
    </div>
  `).join('') || '<div class="empty-state">No spam sources</div>';
}

function renderRealSenders(actionableEmails) {
  const senderCounts = {};
  actionableEmails.forEach(email => {
    const name = extractName(email.from);
    senderCounts[name] = senderCounts[name] || { name, email: email.from, count: 0 };
    senderCounts[name].count++;
  });

  const sorted = Object.values(senderCounts).sort((a, b) => b.count - a.count);

  const sendersContainer = document.getElementById('topSendersList');
  sendersContainer.innerHTML = sorted.slice(0, 10).map((sender, index) => `
    <div class="sender-item">
      <div class="sender-rank">${index + 1}</div>
      <div class="sender-info">
        <div class="sender-name">${sender.name}</div>
        <div class="sender-email">${sender.email}</div>
      </div>
      <div class="sender-count">${sender.count}</div>
    </div>
  `).join('') || '<div class="empty-state">No sender data</div>';
}

function renderSlackDemo() {
  // Add Slack section to overview if not exists
  const overviewSection = document.getElementById('overview');
  const existingSlack = overviewSection.querySelector('.slack-section');
  if (existingSlack) existingSlack.remove();

  const slackHtml = `
    <div class="slack-section">
      <h3><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg> Slack Activity</h3>
      <div class="slack-stats">
        <div class="slack-stat">
          <div class="number">247</div>
          <div class="label">Messages</div>
        </div>
        <div class="slack-stat">
          <div class="number">12</div>
          <div class="label">Mentions</div>
        </div>
        <div class="slack-stat">
          <div class="number">3</div>
          <div class="label">Urgent</div>
        </div>
      </div>
      <div class="slack-channels">
        <div class="slack-channel">
          <span class="channel-name">#nextiva-account</span>
          <span class="channel-count channel-urgent">8 urgent</span>
        </div>
        <div class="slack-channel">
          <span class="channel-name">#general</span>
          <span class="channel-count">47</span>
        </div>
        <div class="slack-channel">
          <span class="channel-name">#paid-media</span>
          <span class="channel-count">38</span>
        </div>
        <div class="slack-channel">
          <span class="channel-name">DM: Sabrina Torres</span>
          <span class="channel-count">15</span>
        </div>
        <div class="slack-channel">
          <span class="channel-name">#client-greenwave</span>
          <span class="channel-count">12</span>
        </div>
      </div>
    </div>
  `;

  // Insert after stats grid
  const statsGrid = overviewSection.querySelector('.stats-grid');
  statsGrid.insertAdjacentHTML('afterend', slackHtml);
}

// Helper functions
function extractName(fromString) {
  if (!fromString) return 'Unknown';
  // Extract name from "Name <email@example.com>" format
  const match = fromString.match(/^([^<]+)/);
  return match ? match[1].trim().replace(/"/g, '') : fromString;
}

function groupBySender(emails) {
  const counts = {};
  emails.forEach(email => {
    const sender = extractName(email.from);
    counts[sender] = (counts[sender] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

// Action handlers
function openEmail(id) {
  if (isDemo) {
    alert('This would open the email in Gmail');
    return;
  }
  window.open(`https://mail.google.com/mail/u/0/#inbox/${id}`, '_blank');
}

function markHandled(btn) {
  btn.closest('.red-flag-card').style.opacity = '0.5';
  btn.textContent = 'Handled ✓';
  btn.disabled = true;
}

function togglePriority(checkbox) {
  const item = checkbox.closest('.priority-item');
  item.style.opacity = checkbox.checked ? '0.5' : '1';
  item.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
}
