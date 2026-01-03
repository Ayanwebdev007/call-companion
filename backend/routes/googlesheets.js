import express from 'express';
import googleSheetsService from '../services/googleSheetsService.js';
import Customer from '../models/Customer.js';
import Spreadsheet from '../models/Spreadsheet.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Validate Google Sheets URL
router.post('/validate', auth, async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    
    if (!sheetUrl) {
      return res.status(400).json({ message: 'Sheet URL is required' });
    }

    const validation = await googleSheetsService.validateSheetAccess(sheetUrl);
    res.json(validation);
  } catch (error) {
    console.error('Error validating Google Sheets:', error);
    res.status(500).json({ message: 'Failed to validate sheet' });
  }
});

// Get sheet data and headers
router.post('/fetch', auth, async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    
    if (!sheetUrl) {
      return res.status(400).json({ message: 'Sheet URL is required' });
    }

    const sheetData = await googleSheetsService.getSheetData(sheetUrl);
    res.json(sheetData);
  } catch (error) {
    console.error('Error fetching Google Sheets:', error);
    res.status(500).json({ message: error.message });
  }
});

// Import mapped data to customers
router.post('/import', auth, async (req, res) => {
  try {
    const { 
      spreadsheetId, 
      sheetUrl, 
      columnMapping, 
      sheetData 
    } = req.body;

    if (!spreadsheetId || !columnMapping || !sheetData) {
      return res.status(400).json({ message: 'Missing required import data' });
    }

    // Verify user has access to the spreadsheet
    const spreadsheet = await Spreadsheet.findOne({ _id: spreadsheetId });
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    // Check ownership or sharing
    let hasAccess = spreadsheet.user_id.toString() === req.user.id;
    if (!hasAccess) {
      const Sharing = (await import('../models/Sharing.js')).default;
      const sharing = await Sharing.findOne({
        spreadsheet_id: spreadsheetId,
        shared_with_user_id: req.user.id
      });
      hasAccess = !!sharing;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this spreadsheet' });
    }

    // Clear existing customers for this spreadsheet (optional - you might want to merge instead)
    await Customer.deleteMany({ 
      spreadsheet_id: spreadsheetId,
      user_id: req.user.id 
    });

    // Map and import customers
    const customers = [];
    const headers = sheetData.headers;
    const data = sheetData.data;

    for (const row of data) {
      if (row.length === 0) continue; // Skip empty rows

      const customer = {
        user_id: req.user.id,
        spreadsheet_id: spreadsheetId,
        customer_name: getMappedValue(row, headers, columnMapping.customerName),
        company_name: getMappedValue(row, headers, columnMapping.companyName),
        phone_number: getMappedValue(row, headers, columnMapping.phoneNumber),
        remark: getMappedValue(row, headers, columnMapping.remarks) || '',
        next_call_date: getMappedValue(row, headers, columnMapping.nextCallDate) || new Date().toISOString().split('T')[0],
        next_call_time: getMappedValue(row, headers, columnMapping.nextCallTime) || '',
        last_call_date: getMappedValue(row, headers, columnMapping.lastCallDate) || '',
        position: customers.length // Maintain order from sheet
      };

      // Only add if we have at least a customer name or phone number
      if (customer.customer_name || customer.phone_number) {
        customers.push(customer);
      }
    }

    // Bulk insert customers
    if (customers.length > 0) {
      await Customer.insertMany(customers);
    }

    res.json({ 
      success: true, 
      imported: customers.length,
      message: `Successfully imported ${customers.length} customers`
    });

  } catch (error) {
    console.error('Error importing Google Sheets data:', error);
    res.status(500).json({ message: 'Failed to import data' });
  }
});

// Helper method to get mapped value from row
function getMappedValue(row, headers, mapping) {
  if (!mapping || mapping === '') return '';
  
  const headerIndex = headers.findIndex(header => 
    header.toLowerCase() === mapping.toLowerCase()
  );
  
  return headerIndex !== -1 && headerIndex < row.length 
    ? row[headerIndex]?.toString().trim() || ''
    : '';
}

// Attach helper to router
router.getMappedValue = getMappedValue;

export default router;