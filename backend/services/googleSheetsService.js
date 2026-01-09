import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.initializeAuth();
  }

  initializeAuth() {
    try {
      const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');

      if (fs.existsSync(serviceAccountPath)) {
        // Use Service Account if available (Premium/Write access)
        console.log('[SHEETS] Initializing with Service Account...');
        this.auth = new google.auth.GoogleAuth({
          keyFile: serviceAccountPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else if (process.env.GOOGLE_API_KEY) {
        // Fallback to API Key for read-only public access
        console.log('[SHEETS] Initializing with API Key (Read-only)...');
        this.auth = process.env.GOOGLE_API_KEY;
      }

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
      throw new Error('Google Sheets API not initialized. Please ensure service-account.json or GOOGLE_API_KEY is set.');
    }
    try {
      const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        throw new Error('Invalid Google Sheets URL');
      }

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

      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:AZ1`,
        valueRenderOption: 'UNFORMATTED_VALUE'
      });
      const headers = headerResponse.data.values?.[0] || [];

      const dataRange = range || `${sheetName}!A2:AZ500`;

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

  async updateSheetData(sheetUrl, data, selectedSheetName = null) {
    if (!this.sheets) {
      throw new Error('Google Sheets API not initialized. Service Account required for write operations.');
    }

    try {
      const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) throw new Error('Invalid Google Sheets URL');

      // 1. Get sheet info to find the correct name
      const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId });
      let sheetName = selectedSheetName;
      if (!sheetName) {
        sheetName = spreadsheet.data.sheets[0].properties.title;
      }

      // 2. Clear existing content first
      console.log(`[SHEETS] Clearing sheet: ${sheetName}...`);
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A1:ZZ5000`
      });

      // 3. Update with new data starting from A1
      console.log(`[SHEETS] Exporting ${data.length} rows to ${sheetName}...`);
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data
        }
      });

      return { success: true, updatedRows: data.length };
    } catch (error) {
      console.error('Error updating Google Sheets data:', error);
      if (error.message.includes('PERMISSION_DENIED')) {
        throw new Error('Permission denied. Please share the Google Sheet with the Service Account email address.');
      }
      throw new Error(`Failed to update sheet: ${error.message}`);
    }
  }

  extractSpreadsheetId(url) {
    const patterns = [
      /\/d\/([a-zA-Z0-9-_]+)/,
      /spreadsheets\.google\.com\/.*\?id=([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async validateSheetAccess(sheetUrl) {
    if (!this.sheets) {
      return { valid: false, error: 'Google Sheets API not initialized.' };
    }
    try {
      const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        return { valid: false, error: 'Invalid Google Sheets URL' };
      }

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
          ? 'Permission denied. If importing a private sheet, ensure IT IS SHARED with the Service Account email.'
          : `Unable to access the sheet: ${error.message}`
      };
    }
  }
}

export default new GoogleSheetsService();