// Analyze emails with Claude AI
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { emails, categories } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'No emails provided' });
    }

    // Prepare email summaries for Claude (limit to prevent token overflow)
    const actionableEmails = categories?.actionable || emails.slice(0, 100);

    const emailSummaries = actionableEmails.slice(0, 75).map((email, idx) => {
      return `[${idx + 1}] From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}
Preview: ${email.snippet?.substring(0, 200)}
---`;
    }).join('\n');

    // Ask Claude to analyze
    const prompt = `You are an executive assistant analyzing emails received while someone was out of office.

Here are the emails that need human attention (already filtered from spam/automated):

${emailSummaries}

Please analyze these emails and return a JSON response with:

1. "redFlags": Array of urgent/critical items that need immediate attention. Look for:
   - Contract threats or cancellation mentions
   - Escalations (CC'd executives, "escalating", "urgent")
   - Deadlines that may have passed
   - Client complaints or dissatisfaction
   - Internal emergencies

   For each red flag include: { "emailIndex": number, "type": "Contract Threat"|"Escalation"|"Urgent Request"|"Deadline"|"Complaint", "reason": "why this is flagged", "severity": 1-3 }

2. "priorities": Array of action items ranked by priority. Include:
   { "emailIndex": number, "priority": 1-4, "action": "what to do", "reason": "why this priority" }

   Priority 1 = Do today (client risk, urgent requests)
   Priority 2 = Do this week (deadlines, approvals needed)
   Priority 3 = Important but not urgent
   Priority 4 = Can wait / FYI

3. "meetingsToSchedule": Array of meetings that should be set up based on email requests:
   { "emailIndex": number, "with": "person/team", "reason": "why meeting needed" }

4. "keyInsights": 2-3 sentences summarizing the most important things to know.

Return ONLY valid JSON, no markdown formatting.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // Parse Claude's response
    let analysis;
    try {
      const content = response.content[0].text;
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseErr) {
      console.error('Failed to parse Claude response:', parseErr);
      analysis = {
        redFlags: [],
        priorities: [],
        meetingsToSchedule: [],
        keyInsights: 'Analysis completed but parsing failed. Please review emails manually.',
        rawResponse: response.content[0].text
      };
    }

    // Enrich analysis with full email data
    if (analysis.redFlags) {
      analysis.redFlags = analysis.redFlags.map(flag => {
        const email = actionableEmails[flag.emailIndex - 1];
        return {
          ...flag,
          email: email ? {
            from: email.from,
            subject: email.subject,
            date: email.date,
            snippet: email.snippet,
            id: email.id
          } : null
        };
      });
    }

    if (analysis.priorities) {
      analysis.priorities = analysis.priorities.map(p => {
        const email = actionableEmails[p.emailIndex - 1];
        return {
          ...p,
          email: email ? {
            from: email.from,
            subject: email.subject,
            date: email.date,
            id: email.id
          } : null
        };
      });
    }

    if (analysis.meetingsToSchedule) {
      analysis.meetingsToSchedule = analysis.meetingsToSchedule.map(m => {
        const email = actionableEmails[m.emailIndex - 1];
        return {
          ...m,
          email: email ? {
            from: email.from,
            subject: email.subject,
            id: email.id
          } : null
        };
      });
    }

    res.json({
      success: true,
      analysis: analysis,
      emailsAnalyzed: actionableEmails.length
    });

  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({
      error: err.message,
      details: err.response?.data || null
    });
  }
};
