# Google Sheets Integration Setup Guide

This guide will help you set up the Google Sheets integration feature for importing customer data.

## 🚀 Feature Overview

The Google Sheets integration allows users to:
- Connect to publicly accessible Google Sheets
- Map sheet columns to customer data fields
- Import customer data directly into spreadsheets
- Auto-detect common column names for intelligent mapping

## 📋 Prerequisites

1. Google Cloud Platform account
2. A Google Sheet with customer data
3. The sheet must be publicly accessible or shared with "Anyone with the link can view"

## 🔧 Backend Setup

### 1. Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create API Key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key
5. **Important**: For security, restrict the API key to only work with Google Sheets API

### 2. Configure Environment Variables

Add the Google API key to your backend environment:

```bash
# In backend/.env
GOOGLE_API_KEY=AIzaSyD5l5OARWu271N1FnoPmmG4835z8s3e5p4
```

### 3. Install Dependencies

The backend dependencies are already added to package.json:
- `googleapis`: Google APIs client library
- `google-auth-library`: Google authentication library

Install them:
```bash
cd backend
npm install
```

## 🎨 Frontend Features

### 1. Google Sheets Dialog Component
- Multi-step import process
- URL validation
- Column mapping interface
- Progress indicators

### 2. Dashboard Integration
- Google Sheets import button on each spreadsheet card
- Green download icon for easy access
- Real-time data refresh after import

### 3. Column Mapping
- Auto-detection of common column names
- Manual mapping override
- Required field validation
- Support for all customer fields

## 📊 Supported Customer Fields

| Field | Required | Common Sheet Column Names |
|-------|----------|---------------------------|
| Customer Name | ✅ | customer, name, contact |
| Company Name | ✅ | company, organization, business |
| Phone Number | ✅ | phone, mobile, tel |
| Remarks | ❌ | remark, note, comment |
| Next Call Date | ❌ | next call date, follow up date |
| Next Call Time | ❌ | next call time, call time |
| Last Call Date | ❌ | last call date, previous call |

## 🔒 Security Considerations

1. **API Key Security**: Store API key in environment variables, never in code
2. **Sheet Access**: Only works with publicly accessible sheets
3. **Data Validation**: Server-side validation of all imported data
4. **User Permissions**: Only spreadsheet owners can import data

## 🚀 Usage Instructions

### For Users:

1. **Prepare Your Google Sheet**:
   - Ensure your sheet has column headers
   - Make the sheet publicly accessible
   - Copy the sheet URL

2. **Import Data**:
   - Go to Dashboard in Call Companion
   - Click the green download icon on any spreadsheet card
   - Paste the Google Sheet URL
   - Map columns to customer fields
   - Click "Import Data"

3. **Verify Import**:
   - Check that all customers were imported correctly
   - Verify phone numbers and names
   - Update any missing information

### For Developers:

1. **API Endpoints**:
   - `POST /api/googlesheets/validate` - Validate sheet URL
   - `POST /api/googlesheets/fetch` - Fetch sheet data
   - `POST /api/googlesheets/import` - Import mapped data

2. **Error Handling**:
   - Invalid URLs
   - Permission denied
   - Missing required fields
   - Network errors

## 🐛 Troubleshooting

### Common Issues:

1. **"Cannot access sheet" Error**:
   - Make sure the sheet is publicly accessible
   - Check that the URL is correct
   - Verify the API key has proper permissions

2. **"No data found" Error**:
   - Ensure the sheet has data rows
   - Check that headers are in the first row
   - Verify the sheet isn't empty

3. **"Invalid Google Sheets URL" Error**:
   - Use the full URL from browser address bar
   - Ensure it's a Google Sheets URL
   - Check for typos in the URL

4. **Column Mapping Issues**:
   - Verify column names match exactly
   - Check for extra spaces in headers
   - Ensure required fields are mapped

### Debug Mode:

Enable debug logging by setting:
```bash
DEBUG=googleapis
```

## 📝 Example Google Sheet Format

| Customer Name | Company Name | Phone Number | Remarks | Next Call Date |
|---------------|-------------|--------------|---------|----------------|
| John Doe | ABC Corp | 555-1234 | Interested in product | 2024-01-15 |
| Jane Smith | XYZ Inc | 555-5678 | Follow up needed | 2024-01-16 |

## 🔄 Future Enhancements

- OAuth2 authentication for private sheets
- Real-time sync with Google Sheets
- Import scheduling
- Multiple sheet support
- Advanced data validation rules

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your Google API key setup
3. Ensure sheet accessibility
4. Check browser console for errors