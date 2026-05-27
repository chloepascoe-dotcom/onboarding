const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TEMPLATE_SPREADSHEET_ID = '1SMGQKvizFBUkWce3yGGFzHYYz913-tjPh1kHtmCAPEA';

async function testConnection() {
  console.log('🔄 Testing Google Sheets connection...\n');

  // Load credentials
  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    console.log('✅ Credentials loaded');
    console.log(`   Project: ${credentials.project_id}`);
    console.log(`   Service Account: ${credentials.client_email}\n`);
  } catch (err) {
    console.log('❌ Could not load credentials.json');
    console.log('   Make sure the file exists in:', __dirname);
    process.exit(1);
  }

  // Authenticate
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  // Test 1: Can we access the Sheets API?
  console.log('📊 Test 1: Sheets API access...');
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: TEMPLATE_SPREADSHEET_ID
    });
    console.log('✅ Can access template sheet:', response.data.properties.title);
  } catch (err) {
    if (err.code === 404) {
      console.log('❌ Template sheet not found. ID:', TEMPLATE_SPREADSHEET_ID);
    } else if (err.code === 403) {
      console.log('❌ No access to template sheet.');
      console.log('   Share the sheet with:', credentials.client_email);
    } else {
      console.log('❌ Sheets API error:', err.message);
    }
  }

  // Test 2: Can we create a new sheet?
  console.log('\n📝 Test 2: Create new sheet...');
  try {
    const newSheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `Test Onboarding - ${new Date().toISOString().slice(0,10)}`
        }
      }
    });
    console.log('✅ Created test sheet:', newSheet.data.spreadsheetUrl);

    // Clean up - delete the test sheet
    await drive.files.delete({ fileId: newSheet.data.spreadsheetId });
    console.log('🗑️  Cleaned up test sheet');
  } catch (err) {
    console.log('❌ Could not create sheet:', err.message);
  }

  // Test 3: Drive API access
  console.log('\n📁 Test 3: Drive API access...');
  try {
    const files = await drive.files.list({
      pageSize: 5,
      fields: 'files(id, name, mimeType)',
      q: "mimeType='application/vnd.google-apps.spreadsheet'"
    });
    console.log('✅ Drive API working. Found', files.data.files.length, 'sheets accessible to service account');
  } catch (err) {
    console.log('❌ Drive API error:', err.message);
  }

  console.log('\n✨ Connection test complete!\n');
  console.log('Next steps:');
  console.log('1. Share your template sheet with:', credentials.client_email);
  console.log('2. Give it "Editor" access');
  console.log('3. Run the onboarding agent!');
}

testConnection().catch(console.error);
