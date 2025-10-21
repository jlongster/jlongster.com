# Newsletter Google Sheets Setup

This guide will help you set up Google Sheets API integration for newsletter signups.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

## Step 2: Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: `newsletter-service-account`
   - Click "Create and Continue"
4. Skip the optional steps and click "Done"

## Step 3: Generate Service Account Key

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Click "Create" - this will download a JSON file

## Step 4: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Newsletter Signups" (or whatever you prefer)
4. In the first row, add headers:
   - A1: `Timestamp`
   - B1: `Email`
   - C1: `Description`
5. Copy the spreadsheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the `SPREADSHEET_ID` part

## Step 5: Share the Sheet with Service Account

1. Click the "Share" button in your Google Sheet
2. Paste the service account email (from the JSON file, looks like `xxx@xxx.iam.gserviceaccount.com`)
3. Give it "Editor" access
4. Uncheck "Notify people" and click "Share"

## Step 6: Set Environment Variables

Add these to your `.env` file:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="your-spreadsheet-id-here"
```

**Note:** The private key should include the newline characters (`\n`). Copy the entire `private_key` value from the JSON file.

## Step 7: Install Dependencies

```bash
npm install googleapis
# or
yarn add googleapis
```

## Testing

Visit `/newsletter` on your site and submit the form. Check your Google Sheet - you should see a new row with the timestamp, email, and description.

## Troubleshooting

- **403 Error**: Make sure you shared the sheet with the service account email
- **Authentication Error**: Verify your environment variables are set correctly
- **Missing Sheet**: Check that your `GOOGLE_SHEET_ID` is correct
