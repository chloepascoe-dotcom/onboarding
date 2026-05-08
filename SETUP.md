# OOO Debrief - Setup Guide

This guide walks you through setting up the OOO Return Debrief application with Google OAuth and the Anthropic API.

## Prerequisites

- Node.js 18+ installed
- A Google Cloud account
- An Anthropic API key (for Claude AI analysis)
- A Vercel account (for deployment)

## 1. Google Cloud Setup

### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" > "New Project"
3. Name it something like "OOO Debrief"
4. Click "Create"

### Enable APIs

1. Go to **APIs & Services** > **Library**
2. Search for and enable:
   - Gmail API
   - Google Calendar API

### Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace org)
3. Fill in the required fields:
   - App name: "OOO Return Debrief"
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue**
5. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
6. Add test users (your email address) while in testing mode
7. Click **Save and Continue**

### Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Application type: **Web application**
4. Name: "OOO Debrief Web Client"
5. Add Authorized JavaScript origins:
   - `http://localhost:3000` (for local development)
   - `https://your-app.vercel.app` (your production URL)
6. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback`
   - `https://your-app.vercel.app/api/auth/callback`
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

## 2. Anthropic API Setup

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Go to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

## 3. Environment Variables

Create a `.env` file in the project root:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-api-key

# App URL (for OAuth redirect)
APP_URL=http://localhost:3000
```

For production, update:
- `GOOGLE_REDIRECT_URI` to your production callback URL
- `APP_URL` to your production URL

## 4. Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Or use Vercel CLI
npx vercel dev
```

The app will be available at `http://localhost:3000`

## 5. Deploy to Vercel

### Via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables in Project Settings:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (use your Vercel URL + `/api/auth/callback`)
   - `ANTHROPIC_API_KEY`
   - `APP_URL` (your Vercel URL)
5. Deploy

### Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_REDIRECT_URI
vercel env add ANTHROPIC_API_KEY
vercel env add APP_URL

# Deploy to production
vercel --prod
```

## 6. Post-Deployment

1. Update Google Cloud OAuth credentials:
   - Add your production URL to Authorized JavaScript origins
   - Add your production callback URL to Authorized redirect URIs

2. Test the application:
   - Visit your deployed URL
   - Click "Connect with Google"
   - Grant permissions
   - Verify email and calendar data loads

## Troubleshooting

### "Access Blocked" Error
- Ensure your email is added as a test user in OAuth consent screen
- Or publish the app for public access (requires verification)

### "redirect_uri_mismatch" Error
- Check that your redirect URI exactly matches what's configured in Google Cloud
- Include the full path: `https://your-app.vercel.app/api/auth/callback`

### API Errors
- Verify all environment variables are set correctly
- Check Vercel function logs for detailed errors
- Ensure APIs (Gmail, Calendar) are enabled in Google Cloud

### Rate Limits
- Gmail API: 250 quota units per user per second
- Calendar API: 1,000 requests per 100 seconds per user
- Anthropic: Varies by plan

## Security Notes

- Never commit `.env` files to version control
- Use environment variables for all secrets
- The app only requests read-only access to Gmail and Calendar
- User tokens are stored in localStorage (client-side only)
- No user data is stored on the server

## Support

For issues, please open a GitHub issue or check the troubleshooting section above.
