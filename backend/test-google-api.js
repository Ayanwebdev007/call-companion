#!/usr/bin/env node

import { google } from 'googleapis';

// Test Google Sheets API with provided key
const testGoogleAPI = async () => {
  try {
    console.log('🔑 Testing Google Sheets API...');
    
    const API_KEY = 'AIzaSyD5l5OARWu271N1FnoPmmG4835z8s3e5p4';
    
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      apiKey: API_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({
      version: 'v4',
      auth: auth
    });

    // Test with a public spreadsheet
    const testSpreadsheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
    
    console.log('📊 Testing with public spreadsheet...');
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: testSpreadsheetId
    });

    console.log('✅ SUCCESS! Google Sheets API is working');
    console.log('📋 Found spreadsheet:', response.data.properties.title);
    console.log('📄 Sheets:', response.data.sheets.map(s => s.properties.title).join(', '));
    
    // Test reading data
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: testSpreadsheetId,
      range: 'Class Data!A1:Z5',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    console.log('📊 Data rows found:', dataResponse.data.values?.length || 0);
    console.log('🏷️ Headers:', dataResponse.data.values?.[0] || []);
    
    return true;
    
  } catch (error) {
    console.error('❌ ERROR: Google Sheets API failed');
    console.error('🔍 Error details:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('💡 Possible fixes:');
      console.log('   1. Check if API key is correct');
      console.log('   2. Ensure Google Sheets API is enabled');
      console.log('   3. Verify API key restrictions');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('💡 Possible fixes:');
      console.log('   1. Check API key permissions');
      console.log('   2. Ensure Google Sheets API is enabled');
      console.log('   3. Verify API key is not restricted');
    }
    
    return false;
  }
};

// Run the test
testGoogleAPI().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 Google Sheets integration is READY TO USE!');
    console.log('💚 You can now import data from Google Sheets');
  } else {
    console.log('❌ Google Sheets integration needs fixing');
  }
  console.log('='.repeat(50));
}).catch(error => {
  console.error('💥 Test script failed:', error);
});