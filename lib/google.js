const { google } = require('googleapis');

const SPREADSHEET_ID = '1SMGQKvizFBUkWce3yGGFzHYYz913-tjPh1kHtmCAPEA';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

module.exports = { getAuth, getSheets, SPREADSHEET_ID, SLACK_WEBHOOK_URL };
