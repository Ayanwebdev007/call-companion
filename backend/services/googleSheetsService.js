import { google } from 'googleapis';

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.initializeAuth();
  }

  initializeAuth() {
    try {
      // Initialize Google Auth with API key for public sheets access
      this.auth = new google.auth.GoogleAuth({
        apiKey: process.env.GOOGLE_API_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });

      this.sheets = google.sheets({
        version: 'v4',
        auth: this.auth
      });
    } catch (error) {
      console.error('Failed to initialize Google Sheets auth:', error);
    }
  }

  async getSheetData(sheetUrl, selectedSheetName = null, range = null) {
    if (!this.sheets) {
      throw new Error('Google Sheets API not initialized. Check your GOOGLE_API_KEY.');
    }
    try {
      // Extract spreadsheet ID from URL
      const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        throw new Error('Invalid Google Sheets URL');
      }

      // Get spreadsheet metadata
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId
      });

      let sheetName = selectedSheetName;
      if (!sheetName) {
        const firstSheet = spreadsheet.data.sheets[0];
        if (!firstSheet) {
          throw new Error('No sheets found in the spreadsheet');
        }
        sheetName = firstSheet.properties.title;
      }

      // Fetch headers first (always from Row 1)
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:AZ1`,
        valueRenderOption: 'UNFORMATTED_VALUE'
      });
      const headers = headerResponse.data.values?.[0] || [];

      // Determine the data range
      // If range is provided (e.g. "A10:AZ50"), use it. Otherwise default to A2:AZ500 for preview
      const dataRange = range || `${sheetName}!A2:AZ500`;

      // Get the data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: dataRange,
        valueRenderOption: 'UNFORMATTED_VALUE'
      });

      const values = response.data.values || [];

      return {
        spreadsheetId,
        sheetName,
        headers,
        data: values,
        totalRows: values.length
      };

    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      throw new Error(`Failed to fetch sheet data: ${error.message}`);
    }
  }

  extractSpreadsheetId(url) {
    // Extract spreadsheet ID from various Google Sheets URL formats
    const patterns = [
      /\/d\/([a-zA-Z0-9-_]+)/,
      /spreadsheets\.google\.com\/.*\?id=([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  async validateSheetAccess(sheetUrl) {
    if (!this.sheets) {
      return { valid: false, error: 'Google Sheets API not initialized. Check your GOOGLE_API_KEY.' };
    }
    try {
      const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        return { valid: false, error: 'Invalid Google Sheets URL' };
      }

      // Try to access the spreadsheet and get its metadata
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId
      });

      const sheets = response.data.sheets || [];
      const sheetDetails = sheets.map(s => ({
        name: s.properties.title,
        rowCount: s.properties.gridProperties.rowCount
      }));
      const title = response.data.properties.title;

      return {
        valid: true,
        title,
        sheets: sheetDetails
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message.includes('PERMISSION_DENIED')
          ? 'Sheet is not publicly accessible or requires permission'
          : `Unable to access the sheet: ${error.message}`
      };
    }
  }
}

export default new GoogleSheetsService();