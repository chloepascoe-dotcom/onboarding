# Onboarding Agent - Hackathon Setup Guide

## Prerequisites

- [ ] n8n instance (cloud or self-hosted)
- [ ] Anthropic API key
- [ ] Asana workspace with API access
- [ ] Slack workspace with bot permissions
- [ ] Google Cloud project with Sheets API enabled
- [ ] (Optional) HubSpot or Salesforce sandbox for webhook testing

---

## 1. Environment Variables

Add these to your n8n credentials or `.env` file:

```bash
# Anthropic (Claude API)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Asana
ASANA_ACCESS_TOKEN=1/xxxxx
ASANA_WORKSPACE_ID=123456789
ASANA_TEAM_ID=987654321

# Slack
SLACK_BOT_TOKEN=xoxb-xxxxx
SLACK_CHANNEL_ID=C0123456789  # e.g., #paid-media or #onboarding

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_SHEETS_FOLDER_ID=1abc123  # Drive folder for new sheets

# Metrics DB (Airtable or Sheets)
AIRTABLE_API_KEY=keyXXXXX
AIRTABLE_BASE_ID=appXXXXX

# CRM (choose one)
HUBSPOT_API_KEY=xxxxx
# or
SALESFORCE_CLIENT_ID=xxxxx
SALESFORCE_CLIENT_SECRET=xxxxx
```

---

## 2. Asana Setup

### Create a Team
1. Go to Asana > Admin > Teams
2. Create team: "Paid Media" (or use existing)
3. Note the Team ID from the URL: `app.asana.com/0/team/TEAM_ID`

### Generate API Token
1. Go to: https://app.asana.com/0/developer-console
2. Create a Personal Access Token
3. Copy token to `ASANA_ACCESS_TOKEN`

### Get Workspace ID
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://app.asana.com/api/1.0/workspaces
```

---

## 3. Slack Setup

### Create Slack App
1. Go to: https://api.slack.com/apps
2. Create New App > From scratch
3. Name: "Onboarding Agent"

### Add Bot Permissions
OAuth & Permissions > Bot Token Scopes:
- `chat:write` - Post messages
- `chat:write.public` - Post to public channels
- `users:read` - Look up user IDs
- `users:read.email` - Match users by email

### Install to Workspace
1. Install App to Workspace
2. Copy Bot User OAuth Token to `SLACK_BOT_TOKEN`

### Get Channel ID
1. Open Slack channel in browser
2. Channel ID is in URL: `slack.com/archives/CHANNEL_ID`

---

## 4. Google Sheets Setup

### Create Service Account
1. Go to: https://console.cloud.google.com
2. Create project or select existing
3. Enable Google Sheets API
4. Create Service Account (IAM > Service Accounts)
5. Generate JSON key
6. Copy entire JSON to `GOOGLE_SERVICE_ACCOUNT_JSON`

### Share Folder with Service Account
1. Create a Google Drive folder for onboarding sheets
2. Share folder with service account email (`xxx@project.iam.gserviceaccount.com`)
3. Give "Editor" access
4. Copy folder ID from URL to `GOOGLE_SHEETS_FOLDER_ID`

---

## 5. n8n Workflow Import

### Import Workflow
1. In n8n, go to Workflows > Import from File
2. Select `n8n-workflow-example.json`
3. Configure credentials for each node

### Configure Credentials
Create credentials in n8n for:
- Anthropic (API Key)
- Asana (Access Token)
- Slack (Bot Token)
- Google Sheets (Service Account)
- Airtable (API Key) - if using for metrics

### Activate Webhook
1. Open the workflow
2. Click the Webhook node
3. Copy the webhook URL (e.g., `https://your-n8n.com/webhook/deal-closed`)
4. This URL receives the CRM payload

---

## 6. Testing

### Test with Sample Payload
Use the test payloads in `test-data.json`.

Via curl:
```bash
curl -X POST https://your-n8n.com/webhook/deal-closed \
  -H "Content-Type: application/json" \
  -d '{
    "event": "deal.closed_won",
    "deal": {
      "client_name": "Test Client",
      "services": ["paid_media"],
      "monthly_budget": 15000,
      "kickoff_date": "2026-05-20",
      "website": "https://example.com",
      "contacts": [{"name": "Test User", "email": "test@example.com", "is_primary": true}]
    }
  }'
```

Or use the n8n Test Webhook feature in the editor.

### Verify Outputs
Check that:
- [ ] Claude returns valid JSON for scope/assignment
- [ ] Google Sheet is created with correct name
- [ ] Asana project is created with tasks
- [ ] Slack message posts to channel
- [ ] DM is sent to assigned owner
- [ ] Metrics row is logged

---

## 7. CRM Webhook (Production)

### HubSpot
1. Settings > Integrations > Private Apps
2. Create app with `crm.objects.deals.read` scope
3. Create workflow: Trigger = Deal stage = Closed Won
4. Action = Webhook to your n8n URL

### Salesforce
1. Setup > Process Automation > Flows
2. Record-Triggered Flow on Opportunity
3. When Stage = Closed Won
4. Action = HTTP Callout to n8n URL

---

## File Reference

| File | Purpose |
|------|---------|
| `onboarding-templates.json` | Service Gantt templates (Paid Media, SEO, Creative) |
| `agent-prompts.json` | Claude API prompts for AI decisions |
| `n8n-workflow-example.json` | n8n workflow configuration |
| `test-data.json` | Sample payloads and team data for testing |

---

## Troubleshooting

**Claude returns malformed JSON**
- Check that prompts specify "Respond with valid JSON"
- Use `JSON.parse()` in a Code node with try/catch

**Asana tasks not assigned**
- Verify user IDs match Asana user GIDs
- Check that assignee has access to the project

**Slack DM fails**
- Bot needs to be in a conversation with user first
- Or use `conversations.open` to create DM channel

**Google Sheet not created**
- Verify service account has Editor access to folder
- Check that Sheets API is enabled in Google Cloud
