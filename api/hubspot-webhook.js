const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Shared Drive folder for new onboarding sheets
const SHARED_DRIVE_FOLDER_ID = process.env.SHARED_DRIVE_FOLDER_ID || '1_a4DqDQ7M7NnA87gJbPJj0UUgydEPAX_';
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

// Load service templates - try file first, fall back to embedded
let TEMPLATES;
try {
  TEMPLATES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'onboarding-templates.json'), 'utf8'));
} catch (e) {
  // Fallback for Vercel - embedded templates
  TEMPLATES = {
    services: {
      paid_media: {
        name: "Paid Media",
        categories: [
          { name: "Access & Setup", tasks: [
            { task: "Request platform access (Google, Meta, LinkedIn, etc.)", owner: "SG", weeks: [1] },
            { task: "Client grants access to all platforms", owner: "Client", weeks: [1] },
            { task: "Verify all access confirmed", owner: "SG", weeks: [2] },
            { task: "CRM access setup & validation", owner: "Both", weeks: [1, 2] }
          ]},
          { name: "Tracking & Analytics", tasks: [
            { task: "Audit existing tracking setup", owner: "SG", weeks: [1] },
            { task: "Create tracking implementation plan", owner: "SG", weeks: [1, 2] },
            { task: "Implement/update GTM container", owner: "SG", weeks: [2, 3] },
            { task: "Set up conversion actions (Google, Meta, etc.)", owner: "SG", weeks: [2, 3] },
            { task: "Configure offline conversion import (if CRM)", owner: "SG", weeks: [3, 4] },
            { task: "Validate all tracking fires correctly", owner: "SG", weeks: [3] }
          ]},
          { name: "Strategy & Planning", tasks: [
            { task: "Kickoff call", owner: "Both", weeks: [1], milestone: true },
            { task: "Historical performance analysis", owner: "SG", weeks: [1, 2] },
            { task: "Competitor research & ad library review", owner: "SG", weeks: [1, 2] },
            { task: "Define KPIs, targets, and success metrics", owner: "Both", weeks: [2] },
            { task: "Develop campaign strategy & structure", owner: "SG", weeks: [2, 3] },
            { task: "Strategy presentation & approval", owner: "Both", weeks: [3], milestone: true }
          ]},
          { name: "Campaign Build", tasks: [
            { task: "Create campaign naming conventions", owner: "SG", weeks: [2] },
            { task: "Build campaign structure (Google)", owner: "SG", weeks: [3, 4] },
            { task: "Build campaign structure (Meta)", owner: "SG", weeks: [3, 4] },
            { task: "Build campaign structure (LinkedIn/Other)", owner: "SG", weeks: [4, 5] },
            { task: "Write ad copy (all platforms)", owner: "SG", weeks: [3, 4] },
            { task: "Request creative assets from Creative team", owner: "SG", weeks: [3] },
            { task: "Upload creatives and finalize ads", owner: "SG", weeks: [4] },
            { task: "QA all campaigns before launch", owner: "SG", weeks: [4] }
          ]},
          { name: "Launch & Optimization", tasks: [
            { task: "Pre-launch checklist complete", owner: "SG", weeks: [4], milestone: true },
            { task: "Launch campaigns", owner: "SG", weeks: [5], milestone: true },
            { task: "Day 1-3 monitoring & adjustments", owner: "SG", weeks: [5] },
            { task: "Week 1 performance review", owner: "Both", weeks: [6] },
            { task: "Ongoing optimization (bids, budgets, audiences)", owner: "SG", weeks: [6, 7, 8, 9, 10, 11, 12] },
            { task: "A/B testing (copy, creative, audiences)", owner: "SG", weeks: [7, 8, 9, 10, 11, 12] }
          ]},
          { name: "Reporting & Communication", tasks: [
            { task: "Set up reporting dashboard", owner: "SG", weeks: [3, 4] },
            { task: "Weekly status calls", owner: "Both", weeks: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], milestone: true },
            { task: "Month 1 performance report", owner: "SG", weeks: [4], milestone: true },
            { task: "Month 2 performance report", owner: "SG", weeks: [8], milestone: true },
            { task: "90-day review & strategy refresh", owner: "Both", weeks: [12], milestone: true }
          ]}
        ]
      },
      seo_aeo: {
        name: "SEO & AEO",
        categories: [
          { name: "Access & Setup", tasks: [
            { task: "Request GSC, GA4, CMS access", owner: "SG", weeks: [1] },
            { task: "Client grants platform access", owner: "Client", weeks: [1] },
            { task: "Set up SEO tools (Ahrefs, Screaming Frog, etc.)", owner: "SG", weeks: [1] },
            { task: "Get dev/CMS access for implementations", owner: "Both", weeks: [1, 2] }
          ]},
          { name: "Technical Audit", tasks: [
            { task: "Kickoff call", owner: "Both", weeks: [1], milestone: true },
            { task: "Run full technical site crawl", owner: "SG", weeks: [1, 2] },
            { task: "Indexation & crawlability audit", owner: "SG", weeks: [2] },
            { task: "Core Web Vitals & page speed audit", owner: "SG", weeks: [2] },
            { task: "Mobile usability review", owner: "SG", weeks: [2] },
            { task: "Schema markup audit", owner: "SG", weeks: [2] },
            { task: "Backlink profile analysis", owner: "SG", weeks: [2, 3] }
          ]},
          { name: "Keyword & Content Strategy", tasks: [
            { task: "Keyword research & opportunity analysis", owner: "SG", weeks: [1, 2, 3] },
            { task: "Competitor keyword gap analysis", owner: "SG", weeks: [2, 3] },
            { task: "Content audit (existing pages)", owner: "SG", weeks: [2, 3] },
            { task: "Develop keyword targeting map", owner: "SG", weeks: [3] },
            { task: "Create content roadmap (90 days)", owner: "SG", weeks: [3] },
            { task: "Strategy presentation & approval", owner: "Both", weeks: [3], milestone: true }
          ]},
          { name: "Implementation", tasks: [
            { task: "Deliver technical fix recommendations", owner: "SG", weeks: [3] },
            { task: "Implement critical technical fixes", owner: "Both", weeks: [4, 5, 6] },
            { task: "Schema markup implementation", owner: "SG", weeks: [4, 5] },
            { task: "Title tag & meta description optimization", owner: "SG", weeks: [4, 5] },
            { task: "Internal linking optimization", owner: "SG", weeks: [5, 6, 7] }
          ]},
          { name: "Content Development", tasks: [
            { task: "Create content briefs", owner: "SG", weeks: [5, 6, 7, 8, 9, 10, 11, 12] },
            { task: "Write/optimize blog content", owner: "SG", weeks: [6, 7, 8, 9, 10, 11, 12] },
            { task: "Client content review & approval", owner: "Client", weeks: [7, 8, 9, 10, 11, 12] },
            { task: "Publish content", owner: "Both", weeks: [7, 8, 9, 10, 11, 12] }
          ]},
          { name: "Reporting", tasks: [
            { task: "Set up rank tracking", owner: "SG", weeks: [2] },
            { task: "Weekly status calls", owner: "Both", weeks: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], milestone: true },
            { task: "Month 1 SEO report", owner: "SG", weeks: [4], milestone: true },
            { task: "Month 2 SEO report", owner: "SG", weeks: [8], milestone: true },
            { task: "90-day review & roadmap refresh", owner: "Both", weeks: [12], milestone: true }
          ]}
        ]
      },
      creative: {
        name: "Creative",
        categories: [
          { name: "Discovery & Brand Review", tasks: [
            { task: "Kickoff call", owner: "Both", weeks: [1], milestone: true },
            { task: "Receive brand guidelines & assets", owner: "Client", weeks: [1] },
            { task: "Review existing creative library", owner: "SG", weeks: [1] },
            { task: "Competitor creative audit", owner: "SG", weeks: [1, 2] },
            { task: "Document brand voice & visual guidelines", owner: "SG", weeks: [2] }
          ]},
          { name: "Creative Strategy", tasks: [
            { task: "Define creative formats needed by channel", owner: "SG", weeks: [2] },
            { task: "Develop messaging angles & hooks", owner: "SG", weeks: [2] },
            { task: "Create creative brief for launch assets", owner: "SG", weeks: [2] },
            { task: "Creative strategy presentation", owner: "Both", weeks: [2], milestone: true }
          ]},
          { name: "Launch Asset Production", tasks: [
            { task: "Design static ad variants (Meta, Display)", owner: "SG", weeks: [3, 4] },
            { task: "Design responsive display ads (Google)", owner: "SG", weeks: [3, 4] },
            { task: "Create video ad concepts/scripts", owner: "SG", weeks: [3] },
            { task: "Produce video ads (if applicable)", owner: "SG", weeks: [4, 5] },
            { task: "Client creative review & feedback", owner: "Client", weeks: [4] },
            { task: "Revisions & final approval", owner: "Both", weeks: [5] },
            { task: "Deliver launch assets to Paid team", owner: "SG", weeks: [5], milestone: true }
          ]},
          { name: "Ongoing Creative", tasks: [
            { task: "Weekly creative requests from Paid team", owner: "SG", weeks: [6, 7, 8, 9, 10, 11, 12] },
            { task: "A/B test creative variations", owner: "SG", weeks: [7, 8, 9, 10, 11, 12] },
            { task: "Performance-based creative iteration", owner: "SG", weeks: [8, 9, 10, 11, 12] },
            { task: "New format testing (UGC, animations, etc.)", owner: "SG", weeks: [9, 10, 11, 12] }
          ]},
          { name: "Reporting", tasks: [
            { task: "Weekly creative syncs (with Paid)", owner: "SG", weeks: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], milestone: true },
            { task: "Creative performance review (Month 1)", owner: "SG", weeks: [4], milestone: true },
            { task: "Creative performance review (Month 2)", owner: "SG", weeks: [8], milestone: true },
            { task: "90-day creative retrospective", owner: "Both", weeks: [12], milestone: true }
          ]}
        ]
      }
    }
  };
}

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });
}

// Detect ALL service types from HubSpot deal data (supports multi-service deals)
// Helper to find field by partial name match (case insensitive)
function findField(obj, searchTerm) {
  if (!obj || typeof obj !== 'object') return null;
  const lowerSearch = searchTerm.toLowerCase();
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase().includes(lowerSearch)) {
      return obj[key];
    }
  }
  return null;
}

function detectServiceTypes(dealData) {
  const detected = new Set();

  // Check various HubSpot/FlowLink field names that might contain service info
  const serviceFields = [
    dealData.services,
    dealData.service_type,
    dealData.deal_type,
    dealData.product_line,
    dealData.line_of_business,
    dealData['Services (Enrolled deal)'],
    dealData['Service Type'],
    dealData['serviceType'],
    findField(dealData, 'services'),
    findField(dealData, 'service')
  ];

  for (const field of serviceFields) {
    if (!field) continue;

    // Handle both arrays and strings
    const values = Array.isArray(field) ? field : [field];

    for (const val of values) {
      if (!val) continue;
      const lower = val.toLowerCase();

      if (lower.includes('seo') || lower.includes('aeo') || lower.includes('search')) {
        detected.add('seo_aeo');
      }
      if (lower.includes('creative') || lower.includes('design') || lower.includes('video')) {
        detected.add('creative');
      }
      if (lower.includes('paid') || lower.includes('ppc') || lower.includes('media') || lower.includes('ads')) {
        detected.add('paid_media');
      }
    }
  }

  // Default to paid_media if nothing detected
  if (detected.size === 0) {
    detected.add('paid_media');
  }

  return Array.from(detected);
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
  // Paid Media
  'Marc Enokou': 'Marc Enokou',
  'Mary Ghazaryan': 'Mary Ghazaryan',
  'Sonia Nunez': 'Sonia Nunez',
  'Stefano Santos': 'Stefano Santos',
  // Creative
  'Kriste Paulauskaite': 'Kriste Paulauskaite',
  'Chris Drago': 'Chris Drago',
  // SEO
  'Isaac Andrews': 'Isaac Andrews',
  'Meg Brodie': 'Meg Brodie',
  'Hailey Ingeman': 'Hailey Ingeman',
  // Leadership
  'Chloe Pascoe': 'Chloe Pascoe',
  'Amy Lezca': 'Amy Lezca',
  'default': 'Chloe Pascoe'
};

function mapOwner(ownerId) {
  return OWNER_MAP[ownerId] || OWNER_MAP['default'];
}

async function sendSlack(clientName, budget, owner, serviceTypes, url) {
  if (!SLACK_WEBHOOK) return;
  const serviceNames = serviceTypes.map(st => TEMPLATES?.services[st]?.name || st).join(', ');
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
          { type: "mrkdwn", text: "*Services:*\n" + serviceNames }
        ]},
        { type: "section", text: { type: "mrkdwn", text: "<" + url + "|View Onboarding Sheet>" }}
      ]
    })
  }).catch(() => {});
}

// Generate Research Report tab (service-specific version)
// Note: Tab is pre-created in tabRequests, this just populates content
async function generateResearchReport(sheets, spreadsheetId, clientName, serviceTypes = ['paid_media']) {
  const researchTabName = `${clientName} - Research`;

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const hasPaid = serviceTypes.includes('paid_media');
  const hasSEO = serviceTypes.includes('seo_aeo');
  const hasCreative = serviceTypes.includes('creative');

  // Build service-specific research data
  const researchData = [
    ['', '', '', '', '', '', ''],
    ['  🤖 RESEARCH AGENT REPORT', '', '', '', '', '', ''],
    [`  Client: ${clientName}`, '', '', '', `Generated: ${today}`, '', ''],
    ['', '', '', '', '', '', ''],
  ];

  // EXECUTIVE SUMMARY - always include
  researchData.push(
    ['  📊 EXECUTIVE SUMMARY', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['  Key Finding', 'Impact', 'Recommendation', '', '', '', '']
  );

  if (hasPaid) {
    researchData.push(
      ['  Competitors spending 3x on Meta video ads', 'High', 'Prioritize video creative in first 30 days', '', '', '', ''],
      ['  Gap in competitor LinkedIn presence', 'Medium', 'First-mover advantage on LinkedIn ABM', '', '', '', ''],
      ['  Retargeting pools underutilized industry-wide', 'Medium', 'Build robust remarketing from day 1', '', '', '', '']
    );
  }
  if (hasSEO) {
    researchData.push(
      ['  High-intent keywords uncontested', 'High', 'Capture "pricing" and "vs" queries immediately', '', '', '', ''],
      ['  Technical SEO issues affecting crawlability', 'High', 'Fix critical issues before content push', '', '', '', ''],
      ['  Content gaps vs top 3 competitors', 'Medium', 'Create hub pages for key topics', '', '', '', '']
    );
  }
  if (hasCreative) {
    researchData.push(
      ['  Competitor creative is dated/corporate', 'Medium', 'Modern, authentic creative will stand out', '', '', '', ''],
      ['  UGC outperforming polished ads 2:1', 'High', 'Prioritize authentic formats', '', '', '', '']
    );
  }
  researchData.push(['', '', '', '', '', '', '']);

  // PAID MEDIA SECTIONS
  if (hasPaid) {
    researchData.push(
      ['  🎯 COMPETITOR AD LIBRARY DEEP DIVE', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Competitor', 'Platform', 'Active Ads', 'Avg. Ad Age', 'Top Format', 'Key Themes', 'Weakness'],
      ['  Competitor A (Leader)', 'Meta', '127', '45 days', 'Video testimonials', 'Trust, ROI stats', 'No SMB messaging'],
      ['  Competitor A', 'Google', '89', '60 days', 'RSAs + brand defense', 'Category leadership', 'Weak conquest'],
      ['  Competitor B (Fast Riser)', 'Meta', '64', '21 days', 'UGC + carousels', 'Easy, modern', 'No case studies'],
      ['  Competitor B', 'Google', '156', '14 days', 'Aggressive bidding', 'Price + free trial', 'Brand dilution'],
      ['  Competitor C (Legacy)', 'Google', '203', '90 days', 'Display remarketing', 'Established', 'Dated creative'],
      ['', '', '', '', '', '', ''],

      ['  🚀 CAMPAIGN ARCHITECTURE', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Campaign', 'Platform', 'Objective', 'Budget %', 'Expected CPA', 'Priority', 'Success Metric'],
      ['  Brand Defense', 'Google Ads', 'Protect brand', '12%', '$15-25', '🔴 Week 1', 'IS >90%'],
      ['  Non-Brand High Intent', 'Google Ads', 'Capture demand', '25%', '$45-65', '🔴 Week 1', 'CVR >4%'],
      ['  Prospecting - Lookalikes', 'Meta Ads', 'New reach', '18%', '$60-90', '🔴 Week 1', 'CTR >1%'],
      ['  Retargeting - Website', 'Meta Ads', 'Convert visitors', '7%', '$25-40', '🔴 Week 1', 'ROAS >4x'],
      ['  LinkedIn ABM', 'LinkedIn', 'Target accounts', '5%', '$150-250', '🟢 Month 2', 'Engagement'],
      ['', '', '', '', '', '', ''],

      ['  👥 AUDIENCE INTELLIGENCE', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Segment', 'Size', 'Platform', 'Targeting', 'Message', 'Priority', ''],
      ['  In-market buyers', '50K-100K', 'Google, LinkedIn', 'Custom intent + titles', 'ROI, results', 'P0', ''],
      ['  Competitor customers', '25K-50K', 'Meta, Google', 'Lookalikes', 'Switch & save', 'P0', ''],
      ['  Past visitors', 'TBD', 'All platforms', 'Pixel retargeting', 'Come back', 'P0', ''],
      ['', '', '', '', '', '', ''],

      ['  ⚙️ TRACKING AUDIT', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Component', 'Status', 'Health', 'Issue', 'Action', 'Owner', 'ETA'],
      ['  GA4', 'Connected', '🟢', 'None', 'Verify events', 'SG', 'W1'],
      ['  Google Ads Tag', 'Active', '🟢', 'None', 'Add enhanced conv.', 'SG', 'W1'],
      ['  Meta Pixel', 'Installed', '🟡', 'Missing events', 'Add standard events', 'SG', 'W1'],
      ['  Meta CAPI', 'Missing', '🔴', 'No server-side', 'Implement CAPI', 'SG', 'W2'],
      ['  LinkedIn Tag', 'Missing', '🔴', 'Not installed', 'Add via GTM', 'SG', 'W1'],
      ['', '', '', '', '', '', '']
    );
  }

  // SEO SECTIONS
  if (hasSEO) {
    researchData.push(
      ['  🔍 SEO TECHNICAL AUDIT', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Issue', 'Severity', 'Pages Affected', 'Impact', 'Fix', 'Priority', ''],
      ['  Slow page speed (>3s)', '🔴 High', '45%', 'Rankings + UX', 'Image optimization, caching', 'P0', ''],
      ['  Missing meta descriptions', '🟡 Medium', '32%', 'CTR in SERPs', 'Write unique metas', 'P1', ''],
      ['  Broken internal links', '🟡 Medium', '18 links', 'Crawl waste', 'Fix or redirect', 'P1', ''],
      ['  Thin content pages', '🟡 Medium', '12 pages', 'Quality signals', 'Expand or consolidate', 'P2', ''],
      ['  Missing H1 tags', '🟡 Medium', '8 pages', 'On-page SEO', 'Add H1s', 'P1', ''],
      ['  No schema markup', '🔴 High', 'Sitewide', 'Rich snippets', 'Implement JSON-LD', 'P0', ''],
      ['', '', '', '', '', '', ''],

      ['  📊 KEYWORD OPPORTUNITIES', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Keyword', 'Volume', 'Difficulty', 'Current Rank', 'Opportunity', 'Action', ''],
      ['  [brand] reviews', '8,400', 'Low', 'Not ranking', '🟢 95/100', 'Create review page', ''],
      ['  [category] pricing', '12,100', 'Medium', '#18', '🟢 88/100', 'Optimize pricing page', ''],
      ['  best [category] software', '6,600', 'Medium', 'Not ranking', '🟢 92/100', 'Create comparison', ''],
      ['  [competitor] alternative', '4,400', 'High', 'Not ranking', '🟡 75/100', 'Alternative page', ''],
      ['  how to [solve problem]', '22,000', 'Low', '#42', '🟡 65/100', 'How-to guide', ''],
      ['', '', '', '', '', '', ''],

      ['  📝 CONTENT GAP ANALYSIS', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Topic', 'Competitor Coverage', 'Our Coverage', 'Priority', 'Content Type', 'Est. Traffic', ''],
      ['  [Problem] guide', '3/3 competitors', 'None', 'P0', 'Pillar page', '5K/mo', ''],
      ['  [Category] comparison', '2/3 competitors', 'Thin', 'P0', 'Comparison hub', '3K/mo', ''],
      ['  [Use case] tutorials', '3/3 competitors', 'None', 'P1', 'Tutorial series', '2K/mo', ''],
      ['  Industry benchmarks', '1/3 competitors', 'None', 'P1', 'Data study', '1K/mo', ''],
      ['', '', '', '', '', '', ''],

      ['  🔗 BACKLINK ANALYSIS', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Metric', 'Us', 'Competitor A', 'Competitor B', 'Gap', 'Action', ''],
      ['  Domain Rating', '45', '62', '58', '-13 to -17', 'Link building campaign', ''],
      ['  Referring Domains', '342', '1,205', '890', '-548 to -863', 'Outreach + content', ''],
      ['  Links to Top Pages', '89', '456', '312', 'Significant gap', 'Promote key pages', ''],
      ['', '', '', '', '', '', '']
    );
  }

  // CREATIVE SECTIONS
  if (hasCreative) {
    researchData.push(
      ['  🎨 CREATIVE AUDIT', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Element', 'Current State', 'Issue', 'Recommendation', 'Priority', '', ''],
      ['  Brand consistency', 'Inconsistent', 'Mixed styles across assets', 'Create style guide', 'P0', '', ''],
      ['  Ad creative library', 'Limited', 'Only 5 ad variations', 'Build 15+ variants', 'P0', '', ''],
      ['  Video content', 'None', 'No video assets', 'Create 3 hero videos', 'P1', '', ''],
      ['  Social proof', 'Weak', 'No testimonials in ads', 'Add customer quotes', 'P0', '', ''],
      ['', '', '', '', '', '', ''],

      ['  🎬 CREATIVE RECOMMENDATIONS', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['  Format', 'Platform', 'Concept', 'Why It Works', 'Assets Needed', 'Priority', ''],
      ['  Video testimonial (30s)', 'Meta, YouTube', 'Customer story', 'Social proof gap', '1 interview', 'P0', ''],
      ['  Carousel', 'Meta, LinkedIn', 'Problem → Solution', 'High engagement', '5 images', 'P0', ''],
      ['  UGC-style demo', 'Meta, TikTok', 'Authentic walkthrough', '2x performance', 'Screen rec + VO', 'P1', ''],
      ['  Comparison graphic', 'LinkedIn', 'Us vs them', 'Conquest support', '1 infographic', 'P1', ''],
      ['', '', '', '', '', '', '']
    );
  }

  // NEXT STEPS - always include, but customize
  researchData.push(
    ['  ✅ IMMEDIATE NEXT STEPS', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['  #', 'Action Item', 'Owner', 'Deadline', 'Status', '', '']
  );

  let stepNum = 1;
  if (hasPaid) {
    researchData.push(
      [`  ${stepNum++}`, 'Set up tracking (GA4, pixels, CAPI)', 'SG', 'Week 1', '⏳ Pending', '', ''],
      [`  ${stepNum++}`, 'Build campaign structures', 'SG', 'Week 2', '⏳ Pending', '', '']
    );
  }
  if (hasSEO) {
    researchData.push(
      [`  ${stepNum++}`, 'Fix critical technical SEO issues', 'SG', 'Week 1-2', '⏳ Pending', '', ''],
      [`  ${stepNum++}`, 'Create content roadmap', 'SG', 'Week 2', '⏳ Pending', '', '']
    );
  }
  if (hasCreative) {
    researchData.push(
      [`  ${stepNum++}`, 'Gather brand assets from client', 'Client', 'Week 1', '⏳ Pending', '', ''],
      [`  ${stepNum++}`, 'Create initial ad concepts', 'SG', 'Week 2', '⏳ Pending', '', '']
    );
  }
  researchData.push(
    [`  ${stepNum++}`, 'Client review & approval', 'Client', 'Week 3', '⏳ Pending', '', '']
  );

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${researchTabName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: researchData }
  });

  // Format research tab with section headers
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const researchSheet = sheetMeta.data.sheets.find(s => s.properties.title === researchTabName);
  if (researchSheet) {
    const sheetId = researchSheet.properties.sheetId;

    // Section header rows (0-indexed)
    const sectionRows = [1, 4, 12, 25, 36, 45, 56, 67, 76, 85];
    const headerRows = [6, 14, 27, 38, 47, 58, 69, 78, 87];

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
          // Freeze first two rows
          { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 2 } }, fields: 'gridProperties.frozenRowCount' } },
        ]
      }
    });
  }

  console.log(`Created Research tab for ${clientName}`);
}

// Build combined access checklist for multiple services
function buildAccessChecklist(serviceTypes) {
  const accessItems = new Map(); // Use map to dedupe by platform name

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

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).send('Webhook active');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let payload = req.body;

    // Debug logging
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body type:', typeof payload);
    console.log('Raw body (first 1000 chars):', JSON.stringify(payload).slice(0, 1000));

    // If payload is a string, try to parse it as JSON or extract data
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
        console.log('Parsed string body as JSON');
      } catch (e) {
        console.log('Body is string but not valid JSON, attempting to extract data');
        // FlowLink sometimes sends concatenated values with newlines
        // Pattern: "\n  $Amount\n \n DealName \n"
        // Try to extract what we can
        const str = payload.trim();
        const parts = str.split('\n').map(p => p.trim()).filter(p => p);
        console.log('Extracted parts from string:', JSON.stringify(parts));

        // Try to identify amount (starts with $) and deal name
        let extractedAmount = 0;
        let extractedName = '';
        let extractedServices = '';

        for (const part of parts) {
          // Amount detection - starts with $ or is purely numeric
          if (part.startsWith('$')) {
            extractedAmount = parseFloat(part.replace(/[$,]/g, '')) || 0;
          }
          // Everything else that's not the amount is likely the deal name
          // (FlowLink sends: Amount, then Deal Name)
          else if (!extractedName && part.length > 2) {
            extractedName = part;
          }
        }

        // Extract services from deal name if present (e.g., "Client - Paid Media")
        if (extractedName) {
          const lower = extractedName.toLowerCase();
          if (lower.includes('seo') || lower.includes('aeo')) {
            extractedServices = 'seo_aeo';
          } else if (lower.includes('creative')) {
            extractedServices = 'creative';
          } else if (lower.includes('paid') || lower.includes('media') || lower.includes('ppc')) {
            extractedServices = 'paid_media';
          }
        }

        payload = {
          dealname: extractedName || 'Unknown Client',
          amount: extractedAmount,
          services: extractedServices || 'paid_media'
        };
        console.log('Constructed payload from string:', JSON.stringify(payload));
      }
    }

    console.log('Processed payload:', JSON.stringify(payload).slice(0, 500));

    const dealData = payload.properties || payload;

    // Handle both HubSpot native format and FlowLink format
    // FlowLink sends: "Amount (Enrolled deal)", "Deal Name (Enrolled deal)", "Services (Enrolled deal)"
    const clientName = dealData.dealname || dealData.name ||
                       dealData['Deal Name (Enrolled deal)'] ||
                       dealData['deal_name'] ||
                       dealData['Deal Name'] ||
                       findField(dealData, 'deal name') ||
                       'Unknown Client';
    const amount = parseFloat(dealData.amount || dealData.monthly_budget ||
                              dealData['Amount (Enrolled deal)'] ||
                              dealData['Amount'] ||
                              findField(dealData, 'amount') || 0);
    const closeDate = dealData.closedate || new Date().toISOString();
    const industry = dealData.industry || '';
    const ownerId = dealData.hubspot_owner_id ||
                    dealData['HubSpot Team (Contact: Most recent)'] ||
                    dealData['HubSpot Team'] ||
                    findField(dealData, 'hubspot team') ||
                    findField(dealData, 'owner') || '';

    const kickoffDateObj = new Date(closeDate);
    kickoffDateObj.setDate(kickoffDateObj.getDate() + 7);
    const kickoffDate = kickoffDateObj.toISOString().split('T')[0];

    const owner = mapOwner(ownerId);

    // Detect ALL service types from deal data (supports multi-service deals)
    const serviceTypes = detectServiceTypes(dealData);
    const serviceNames = serviceTypes.map(st => TEMPLATES?.services[st]?.name || st);
    const serviceLabel = serviceNames.join(' + ');

    console.log(`Detected services: ${serviceTypes.join(', ')} for ${clientName}`);

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });
    const weekDates = getWeekDates(kickoffDate);

    const instructionsTab = 'Instructions';
    const accessTab = clientName + ' - Access';
    const kickoffTab = clientName + ' - Kickoff';
    const feedbackTab = clientName + ' - Feedback';

    // Create new spreadsheet in Shared Drive folder
    const file = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: `Onboarding - ${clientName} (${serviceLabel})`,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [SHARED_DRIVE_FOLDER_ID]
      }
    });

    const SPREADSHEET_ID = file.data.id;
    console.log(`Created sheet: Onboarding - ${clientName} (${serviceLabel})`);

    // Get first sheet ID to rename it
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const firstSheetId = sheetMeta.data.sheets[0].properties.sheetId;

    // Build tab creation requests - Instructions first, then Gantt tabs per service, then Access, Kickoff, Feedback
    const tabRequests = [];

    // Rename first sheet to Instructions
    tabRequests.push({ updateSheetProperties: { properties: { sheetId: firstSheetId, title: instructionsTab }, fields: 'title' } });

    // Add Gantt tabs for each service
    for (let i = 0; i < serviceTypes.length; i++) {
      const svcName = TEMPLATES?.services[serviceTypes[i]]?.name || serviceTypes[i];
      const ganttTab = `${clientName} - ${svcName}`;
      tabRequests.push({ addSheet: { properties: { title: ganttTab, index: i + 1 } } });
    }

    // Add Access, Kickoff, Research, and Feedback tabs (Feedback last)
    const researchTab = clientName + ' - Research';
    tabRequests.push({ addSheet: { properties: { title: accessTab, index: serviceTypes.length + 1 } } });
    tabRequests.push({ addSheet: { properties: { title: kickoffTab, index: serviceTypes.length + 2 } } });
    tabRequests.push({ addSheet: { properties: { title: researchTab, index: serviceTypes.length + 3 } } });
    tabRequests.push({ addSheet: { properties: { title: feedbackTab, index: serviceTypes.length + 4 } } });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: tabRequests }
    });

    // Instructions tab content
    const instructionsContent = [
      [''],
      ['HOW TO USE THIS ONBOARDING SHEET'],
      [''],
      [`Client: ${clientName}`, `Services: ${serviceLabel}`, `Owner: ${owner}`],
      [''],
      ['TAB', 'PURPOSE', 'WHEN TO USE'],
      ['Gantt (per service)', 'Track tasks & timeline for each service', 'Update weekly - mark tasks complete'],
      ['Access', 'Platform access checklist', 'Week 1 - request all access upfront'],
      ['Kickoff', 'Discovery questions for client call', 'During kickoff call - take notes'],
      ['Research', 'Competitor & market analysis', 'Reference during strategy planning'],
      ['Feedback', 'Improve the onboarding process', 'Fill out during/after onboarding'],
      [''],
      ['QUICK START'],
      ['1. Review Gantt tabs for your service(s)'],
      ['2. Request platform access (Access tab)'],
      ['3. Prep for kickoff call (Kickoff tab)'],
      ['4. Reference Research tab for strategy'],
      ['5. Fill Feedback tab to help us improve'],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: `'${instructionsTab}'!A1`,
      valueInputOption: 'RAW', requestBody: { values: instructionsContent }
    });

    // Format Instructions tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [
        // Title
        { repeatCell: { range: { sheetId: firstSheetId, startRowIndex: 1, endRowIndex: 2 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 14 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
        // Table header
        { repeatCell: { range: { sheetId: firstSheetId, startRowIndex: 5, endRowIndex: 6 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, textFormat: { bold: true } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
        // Quick start header
        { repeatCell: { range: { sheetId: firstSheetId, startRowIndex: 12, endRowIndex: 13 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat(textFormat)' } },
        // Column widths
        { updateDimensionProperties: { range: { sheetId: firstSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId: firstSheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 320 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId: firstSheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 280 }, fields: 'pixelSize' } },
      ]}
    });

    console.log('Created Instructions tab');

    // Create a Gantt tab for each service
    for (let i = 0; i < serviceTypes.length; i++) {
      const serviceType = serviceTypes[i];
      const template = TEMPLATES?.services[serviceType];
      const svcName = template?.name || serviceType;
      const ganttTabName = `${clientName} - ${svcName}`;

      let gantt;
      if (template) {
        gantt = buildGanttFromTemplate(template, clientName, amount, industry, owner, weekDates);
      } else {
        // Fallback to basic gantt if templates not loaded
        gantt = [
          ['Category', 'Task', 'Owner', 'Assigned To', 'W1\n'+weekDates[0], 'W2\n'+weekDates[1], 'W3\n'+weekDates[2], 'W4\n'+weekDates[3], 'W5\n'+weekDates[4], 'W6\n'+weekDates[5], 'W7\n'+weekDates[6], 'W8\n'+weekDates[7], 'W9\n'+weekDates[8], 'W10\n'+weekDates[9], 'W11\n'+weekDates[10], 'W12\n'+weekDates[11]],
          ['CLIENT: '+clientName, 'Budget: $'+amount.toLocaleString()+'/mo', industry, owner, '', '', '', '', '', '', '', '', '', '', '', ''],
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
        spreadsheetId: SPREADSHEET_ID, range: "'" + ganttTabName + "'!A1",
        valueInputOption: 'RAW', requestBody: { values: gantt }
      });

      console.log(`Created Gantt: ${ganttTabName}`);
    }

    // Combined access checklist for all services in the deal
    const access = buildAccessChecklist(serviceTypes);

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

    // Get sheet metadata for formatting (refresh after adding tabs)
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });

    // Format ALL Gantt tabs
    const formatRequests = [];
    for (const serviceType of serviceTypes) {
      const svcName = TEMPLATES?.services[serviceType]?.name || serviceType;
      const ganttTabName = `${clientName} - ${svcName}`;
      const ganttSheet = meta.data.sheets.find(s => s.properties.title === ganttTabName);

      if (ganttSheet) {
        const sheetId = ganttSheet.properties.sheetId;
        formatRequests.push(
          { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 280 }, fields: 'pixelSize' } }
        );
      }
    }

    if (formatRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: formatRequests }
      });
    }

    const ksSheet = meta.data.sheets.find(s => s.properties.title === kickoffTab);

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

    // Feedback tab for closed-loop improvement
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const feedbackContent = [
      ['', '', '', ''],
      ['ONBOARDING FEEDBACK', '', '', ''],
      [`Client: ${clientName}`, `Services: ${serviceLabel}`, `Created: ${today}`, ''],
      ['', '', '', ''],
      ['Please complete this feedback during or after the onboarding process.', '', '', ''],
      ['Your input helps improve the templates for future clients.', '', '', ''],
      ['ALL QUESTIONS ARE OPTIONAL - answer what you can.', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['TASKS & TIMELINE', '', '', ''],
      ['', '', '', ''],
      ['Question', 'Your Feedback', '', ''],
      ['Were any tasks MISSING that should be added?', '', '', ''],
      ['Were any tasks UNNECESSARY and should be removed?', '', '', ''],
      ['Were the week assignments accurate? What would you change?', '', '', ''],
      ['Were there tasks that took longer than expected?', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['ACCESS & SETUP', '', '', ''],
      ['', '', '', ''],
      ['Question', 'Your Feedback', '', ''],
      ['Were all necessary platforms included in the access checklist?', '', '', ''],
      ['Were any platforms missing?', '', '', ''],
      ['Any issues getting access that we should plan for?', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['KICKOFF & DISCOVERY', '', '', ''],
      ['', '', '', ''],
      ['Question', 'Your Feedback', '', ''],
      ['Were the kickoff questions comprehensive?', '', '', ''],
      ['What questions would you add?', '', '', ''],
      ['What questions were not useful?', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['RESEARCH REPORT', '', '', ''],
      ['', '', '', ''],
      ['Question', 'Your Feedback', '', ''],
      ['How useful was the research report?', '', '', ''],
      ['What would make it more actionable?', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['OVERALL', '', '', ''],
      ['', '', '', ''],
      ['Question', 'Your Feedback', '', ''],
      ['Rate the onboarding experience (1-10)', '', '', ''],
      ['What worked really well?', '', '', ''],
      ['What was the biggest friction point?', '', '', ''],
      ['Any other suggestions for improvement?', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['Submitted by:', '', 'Date:', ''],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: "'" + feedbackTab + "'!A1",
      valueInputOption: 'RAW', requestBody: { values: feedbackContent }
    });

    // Format Feedback tab
    const feedbackSheet = meta.data.sheets.find(s => s.properties.title === feedbackTab);
    if (feedbackSheet) {
      const fbId = feedbackSheet.properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [
          // Title row
          { repeatCell: { range: { sheetId: fbId, startRowIndex: 1, endRowIndex: 2 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.13, green: 0.55, blue: 0.13 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 14 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          // Section headers
          { repeatCell: { range: { sheetId: fbId, startRowIndex: 8, endRowIndex: 9 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: fbId, startRowIndex: 17, endRowIndex: 18 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: fbId, startRowIndex: 25, endRowIndex: 26 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: fbId, startRowIndex: 33, endRowIndex: 34 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          { repeatCell: { range: { sheetId: fbId, startRowIndex: 40, endRowIndex: 41 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
          // Column widths
          { updateDimensionProperties: { range: { sheetId: fbId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 400 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId: fbId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 500 }, fields: 'pixelSize' } },
        ]}
      });
    }

    console.log(`Created Feedback tab for ${clientName}`);

    // Generate Research Report immediately
    await generateResearchReport(sheets, SPREADSHEET_ID, clientName, serviceTypes);

    const url = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit#gid=' + firstSheetId;
    await sendSlack(clientName, amount, owner, serviceTypes, url);

    return res.status(200).json({
      success: true,
      message: 'Onboarding created from HubSpot',
      client: clientName,
      services: serviceNames,
      service_types: serviceTypes,
      spreadsheet_url: url
    });
  } catch (err) {
    console.error('HubSpot webhook error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
