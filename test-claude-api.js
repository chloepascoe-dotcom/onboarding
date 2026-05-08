/**
 * Onboarding Agent - Claude API Test Script
 *
 * Tests the AI decision-making logic before integrating with n8n.
 * Run: ANTHROPIC_API_KEY=sk-ant-xxx node test-claude-api.js
 */

const Anthropic = require('@anthropic-ai/sdk').default;

// Initialize client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Test deal data (from test-data.json)
const testDeal = {
  client_name: "TechFlow Industries",
  services: ["paid_media", "seo_aeo", "creative"],
  monthly_budget: 75000,
  kickoff_date: "2026-05-15",
  industry: "B2B SaaS",
  website: "https://techflow.io",
  primary_contact: "sarah.mitchell@techflow.io",
  sales_notes: "Enterprise SaaS company looking to scale pipeline. Currently running some Google Ads in-house but not profitable. No SEO presence. Need full creative support."
};

// Team data
const teamWorkload = `
- Alex Kim (user_001): 6/8 accounts, $380k budget managed, 1 upcoming kickoff
- Jordan Reyes (user_002): 7/10 accounts, $180k budget managed, 0 upcoming kickoffs
- Sam Patel (user_003): 5/6 accounts, 95/120 hours, 1 upcoming kickoff
- Riley Chen (user_004): 6/8 accounts, 110/140 hours, 0 upcoming kickoffs
- Morgan Liu (user_005): 4/5 accounts, 85/100 hours, 0 upcoming kickoffs
- Casey Brooks (user_006): 6/8 accounts, 120/140 hours, 1 upcoming kickoff
`;

const teamProfiles = `
- Alex Kim (user_001): Senior Paid Media Strategist. Expertise: Google, Meta, LinkedIn. Industries: B2B SaaS, Technology. Strengths: Enterprise accounts, lead gen, complex attribution.
- Jordan Reyes (user_002): Paid Media Manager. Expertise: Meta, Google, TikTok. Industries: E-commerce, DTC, Health & Wellness. Strengths: DTC brands, Shopping campaigns.
- Sam Patel (user_003): SEO Director. Expertise: Technical SEO, content strategy. Industries: SaaS, Finance, Healthcare. Strengths: Enterprise technical SEO, content-led growth.
- Riley Chen (user_004): SEO Manager. Expertise: Local SEO, content optimization. Industries: Local Services, Healthcare, Legal. Strengths: Local SEO, quick wins.
- Morgan Liu (user_005): Creative Director. Expertise: Brand strategy, video production. Strengths: Brand development, video ads, high-end creative.
- Casey Brooks (user_006): Senior Designer. Expertise: Static ads, landing pages. Industries: E-commerce, DTC, SaaS. Strengths: High-volume ad creative, rapid iteration.
`;

// System prompt
const systemPrompt = `You are an onboarding coordinator for Single Grain, a digital marketing agency. Your job is to analyze new client deals and make intelligent decisions about scope, complexity, and team assignments.

You have access to:
1. Deal data from CRM (client name, services purchased, budget, contacts, kickoff date)
2. Current team workload data
3. Team member expertise profiles

You must output structured JSON with your decisions and reasoning.`;

// User prompt
const userPrompt = `A new client has signed. Analyze the deal and make routing decisions.

## Deal Information
- Client Name: ${testDeal.client_name}
- Services Purchased: ${testDeal.services.join(', ')}
- Monthly Budget: $${testDeal.monthly_budget}
- Kickoff Date: ${testDeal.kickoff_date}
- Industry: ${testDeal.industry}
- Website: ${testDeal.website}
- Primary Contact: ${testDeal.primary_contact}
- Notes from Sales: ${testDeal.sales_notes}

## Current Team Workload
${teamWorkload}

## Team Expertise Profiles
${teamProfiles}

## Your Tasks
1. Determine which channels/services should be included based on budget and goals
2. Assess complexity level (low/medium/high) based on scope and client needs
3. Assign a primary owner for EACH service based on expertise match and current capacity
4. Provide clear reasoning for your decisions

Respond with valid JSON matching this schema:
{
  "scope": {
    "services": ["paid_media", "seo_aeo", "creative"],
    "channels_recommended": ["google_search", "meta", "linkedin"],
    "complexity": "medium",
    "estimated_hours_per_month": 40
  },
  "assignments": {
    "paid_media": {
      "owner_id": "user_001",
      "owner_name": "Alex Kim",
      "reasoning": "..."
    },
    "seo_aeo": {
      "owner_id": "user_003",
      "owner_name": "Sam Patel",
      "reasoning": "..."
    },
    "creative": {
      "owner_id": "user_005",
      "owner_name": "Morgan Liu",
      "reasoning": "..."
    }
  },
  "priority_flags": {
    "tight_timeline": false,
    "enterprise_client": true,
    "requires_cross_team_coordination": true
  },
  "first_week_priorities": [
    "Schedule kickoff call with all owners",
    "Request platform access",
    "..."
  ]
}`;

async function testScopeAndAssignment() {
  console.log('='.repeat(60));
  console.log('ONBOARDING AGENT - Claude API Test');
  console.log('='.repeat(60));
  console.log('\nTest Deal:', testDeal.client_name);
  console.log('Services:', testDeal.services.join(', '));
  console.log('Budget: $' + testDeal.monthly_budget.toLocaleString());
  console.log('\nCalling Claude API...\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
      system: systemPrompt
    });

    const content = response.content[0].text;

    console.log('Raw Response:');
    console.log('-'.repeat(40));
    console.log(content);
    console.log('-'.repeat(40));

    // Parse and validate JSON
    try {
      const parsed = JSON.parse(content);
      console.log('\nParsed Successfully!');
      console.log('\nScope:');
      console.log('  Complexity:', parsed.scope.complexity);
      console.log('  Channels:', parsed.scope.channels_recommended.join(', '));

      console.log('\nAssignments:');
      for (const [service, assignment] of Object.entries(parsed.assignments)) {
        console.log(`  ${service}: ${assignment.owner_name} (${assignment.owner_id})`);
        console.log(`    Reasoning: ${assignment.reasoning}`);
      }

      console.log('\nFirst Week Priorities:');
      parsed.first_week_priorities.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p}`);
      });

      console.log('\nPriority Flags:', parsed.priority_flags);

      // Write output to file for inspection
      const fs = require('fs');
      fs.writeFileSync(
        'test-output.json',
        JSON.stringify(parsed, null, 2)
      );
      console.log('\nOutput saved to test-output.json');

    } catch (parseError) {
      console.error('\nFailed to parse JSON:', parseError.message);
      console.log('Response was not valid JSON. Check the raw response above.');
    }

    console.log('\nAPI Usage:');
    console.log('  Input tokens:', response.usage.input_tokens);
    console.log('  Output tokens:', response.usage.output_tokens);

  } catch (error) {
    console.error('API Error:', error.message);
    if (error.status === 401) {
      console.log('\nCheck your ANTHROPIC_API_KEY environment variable.');
    }
  }
}

// Run test
testScopeAndAssignment();
