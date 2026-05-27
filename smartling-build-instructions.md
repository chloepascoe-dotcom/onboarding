# Smartling: Internal Build Instructions

## Account Access
- [ ] Google Ads access confirmed
- [ ] LinkedIn Campaign Manager access confirmed
- [ ] Meta Business Manager access confirmed
- [ ] Microsoft Ads access confirmed
- [ ] Google Analytics 4 access confirmed
- [ ] GTM access confirmed (if available)

---

## Pre-Build Checklist

### Tracking Setup (No Conversions Yet)
Since conversion tracking isn't available, set up what we can:

1. **UTM Parameters** - Strict naming convention:
   - `utm_source`: google, linkedin, meta, microsoft
   - `utm_medium`: cpc, paid-social
   - `utm_campaign`: [platform]_[campaign-type]_[audience]
   - `utm_content`: [ad-variant]

   Example: `?utm_source=linkedin&utm_medium=paid-social&utm_campaign=linkedin_prospecting_directors&utm_content=case-study-v1`

2. **GA4 Audiences** - Create for retargeting:
   - All visitors (30 days)
   - High-intent pages (pricing, demo, contact)
   - Blog readers (content consumers)
   - Return visitors (2+ sessions)

3. **LinkedIn Insight Tag** - Verify installed, create audiences

4. **Meta Pixel** - Verify installed, create audiences

---

## Google Ads Build

### Account Structure
```
Smartling (Account)
├── Brand
│   └── Brand - Core [Exact + Phrase]
├── Non-Brand - High Intent
│   ├── Translation Software [Exact]
│   ├── Translation Software [Phrase]
│   ├── Localization Platform [Exact]
│   └── Localization Platform [Phrase]
├── Non-Brand - Consideration
│   ├── Translation Services [Exact]
│   └── Website Translation [Phrase]
├── Competitor
│   ├── Competitor A [Exact]
│   ├── Competitor B [Exact]
│   └── Competitor Alternatives [Phrase]
└── Display - Retargeting
    └── All Visitors - 30 Days
```

### Campaign Settings
| Setting | Value |
|---------|-------|
| Bid Strategy | Maximize Clicks (until conversion data) |
| Networks | Search only (no partners) |
| Locations | US, UK, Canada, Germany, France |
| Languages | English |
| Ad Rotation | Optimize |
| Ad Schedule | Mon-Fri 6am-8pm (adjust by timezone) |

### Keyword Lists

**Brand:**
- smartling
- smartling translation
- smartling localization
- smartling software

**High-Intent (start here):**
- translation management software
- translation management system
- localization software
- localization platform
- enterprise translation software
- translation management platform
- TMS software

**Consideration:**
- website translation tool
- app localization
- software localization
- translation workflow
- multilingual content management

**Competitor:**
- phrase localization
- lokalise alternative
- transifex competitor
- crowdin alternative
- memsource alternative

### Ad Copy Framework

**RSA Headlines (15):**
1. Enterprise Translation Software
2. Smartling Localization Platform
3. Translate Content at Scale
4. AI-Powered Translation
5. 150+ Languages Supported
6. Trusted by Global Brands
7. Faster Time to Market
8. Reduce Translation Costs
9. Request a Demo Today
10. See Smartling in Action
11. Translation Management System
12. Localization Made Simple
13. Global Content Platform
14. Launch in Any Language
15. [Keyword Insertion]

**RSA Descriptions (4):**
1. Smartling's translation management platform helps enterprises localize content faster. AI-powered, 150+ languages. Request a demo.
2. Reduce translation costs by 50% while improving quality. Smartling powers localization for the world's leading brands.
3. From websites to apps to marketing content—translate everything in one platform. See why enterprises choose Smartling.
4. Automate translation workflows, maintain brand consistency, and launch globally faster. Get started with Smartling today.

### Negative Keywords (Account Level)
- free
- cheap
- jobs
- career
- salary
- tutorial
- course
- certification
- google translate
- freelance
- api (unless targeting developers)

---

## LinkedIn Ads Build

### Campaign Structure
```
Smartling (Account)
├── Prospecting - Directors+
│   ├── Localization Leaders
│   ├── Product Leaders
│   └── Marketing Leaders
├── Prospecting - Managers
│   ├── Localization Managers
│   └── Product Managers
└── Retargeting
    ├── Website Visitors
    └── Engaged Users
```

### Audience Builds

**Localization Leaders:**
- Job Titles: VP Localization, Director of Localization, Head of Localization, VP International, Director of International
- Company Size: 501+
- Industries: Software, SaaS, E-commerce, Gaming, Media

**Product Leaders:**
- Job Titles: VP Product, Director of Product, Head of Product, Chief Product Officer
- Company Size: 1001+
- Industries: Software, SaaS
- Skills: Internationalization, Product Localization

**Marketing Leaders:**
- Job Titles: VP Marketing, Director of Marketing, CMO, Head of Global Marketing
- Company Size: 501+
- Industries: Software, SaaS, E-commerce
- Skills: International Marketing, Global Marketing

### Ad Specs
| Format | Image Size | Headline | Description |
|--------|------------|----------|-------------|
| Single Image | 1200x627 | 70 chars | 150 chars |
| Document Ad | 1080x1080 (pages) | 70 chars | 70 chars |
| Conversation Ad | N/A | N/A | Custom flow |

### Creative Themes
1. **Case Study** - "[Brand] reduced translation time by 60%"
2. **Thought Leadership** - "The future of AI-powered localization"
3. **Pain Point** - "Still managing translations in spreadsheets?"
4. **Social Proof** - "Trusted by [logos]"

### Budget Pacing
- Daily budget: ~$580
- Prospecting: $405/day (70%)
- Retargeting: $175/day (30%)

---

## Meta Ads Build

### Campaign Structure
```
Smartling (Account)
├── Retargeting - Website Visitors
│   └── All Visitors 30D (exclude converters)
└── Retargeting - LinkedIn Engaged
    └── Custom audience sync
```

### Audience Builds
- Website Visitors (30 days)
- High-Intent Pages (pricing, demo, contact - 60 days)
- Video Viewers (if running video)

### Ad Specs
| Format | Size | Primary Text | Headline |
|--------|------|--------------|----------|
| Single Image | 1080x1080 | 125 chars | 40 chars |
| Carousel | 1080x1080 | 125 chars | 40 chars/card |

### Budget Pacing
- Daily budget: ~$250
- Focus on retargeting only until conversion tracking is live

---

## Optimization Playbook (No Conversions)

### Week 1-2: Launch & Learn
- Monitor CTR, CPC, impression share
- Pause keywords with <0.5% CTR after 1000 impressions
- Add negative keywords from search terms report

### Week 3-4: Refine
- Identify top performing ad copy
- Pause underperforming audiences
- Adjust bids based on engagement

### Ongoing Proxies for Success
| Signal | Good | Action if Low |
|--------|------|---------------|
| Google CTR | >2% | Improve ad copy, add negatives |
| LinkedIn CTR | >0.5% | Refine audience, test creative |
| Bounce Rate | <50% | Check landing page relevance |
| Time on Site | >2 min | Traffic is qualified |
| Pages/Session | >2 | Traffic is engaged |

### Weekly Reporting
Pull these metrics weekly:
- Spend by platform/campaign
- Clicks, CTR, CPC by campaign
- GA4: Sessions, bounce rate, time on site from paid
- Qualitative: Demo requests (manual count)

---

## Asset Requests from Client
- [ ] Logo files (PNG, SVG)
- [ ] Brand guidelines (colors, fonts)
- [ ] Approved messaging/taglines
- [ ] Customer logos for social proof
- [ ] Case studies or testimonials
- [ ] Landing page URLs
- [ ] Any existing ad creative

---

## Launch Checklist
- [ ] All campaigns in draft, reviewed
- [ ] UTMs verified
- [ ] Audiences built and populated
- [ ] Daily budgets set correctly
- [ ] Ad schedules configured
- [ ] Negative keywords added
- [ ] Client approval received
- [ ] Launch date confirmed

---

*Internal use only - Out of Office Media*
