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
    const { sheetUrl, sheetName, startRow, endRow } = req.body;

    if (!sheetUrl) {
      return res.status(400).json({ message: 'Sheet URL is required' });
    }

    let range = null;
    if (startRow && endRow) {
      range = `${sheetName}!A${startRow}:Z${endRow}`;
    }

    const sheetData = await googleSheetsService.getSheetData(sheetUrl, sheetName, range);
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
      sheetData,
      importRange // { startRow, endRow, sheetName }
    } = req.body;

    if (!spreadsheetId || !columnMapping || (!sheetData && !importRange)) {
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

    // If a specific range is requested, fetch fresh data on the backend to avoid payload limits
    let finalData = sheetData?.data;
    let finalHeaders = sheetData?.headers;

    if (importRange && importRange.startRow && importRange.endRow) {
      const grange = `${importRange.sheetName}!A${importRange.startRow}:Z${importRange.endRow}`;
      const freshData = await googleSheetsService.getSheetData(sheetUrl, importRange.sheetName, grange);
      finalData = freshData.data;
      finalHeaders = freshData.headers;
    }

    if (!finalData || !finalHeaders) {
      return res.status(400).json({ message: 'No data source found for import' });
    }

    // Map and import customers
    const customers = [];
    const headers = finalHeaders;
    const data = finalData;

    for (const row of data) {
      if (row.length === 0 || row.every(cell => !cell)) continue; // Skip empty rows

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

      if (customer.customer_name || customer.phone_number) {
        // Fallback for company_name which is required but might be missing in some rows
        if (!customer.company_name) customer.company_name = 'N/A';
        // Fallback for name/phone if one is present but other is missing
        if (!customer.customer_name) customer.customer_name = 'Unknown';
        if (!customer.phone_number) customer.phone_number = 'N/A';

        // Handle dynamic meta_data for Meta spreadsheets
        if (spreadsheet.is_meta && spreadsheet.meta_headers && spreadsheet.meta_headers.length > 0) {
          customer.meta_data = {};
          spreadsheet.meta_headers.forEach(header => {
            const val = getMappedValue(row, headers, header);
            if (val) {
              customer.meta_data[header] = val;
            }
          });
        }

        customers.push(customer);
      }
    }

    // Bulk insert customers
    if (customers.length > 0) {
      try {
        const insertedCustomers = await Customer.insertMany(customers);

        // SYNC TO MASTER SHEET (BULK)
        if (spreadsheet.is_meta && !spreadsheet.is_master) {
          const masterSheet = await Spreadsheet.findOne({
            business_id: spreadsheet.business_id,
            page_name: spreadsheet.page_name,
            form_name: spreadsheet.form_name,
            is_master: true
          });

          if (masterSheet) {
            console.log(`[SYNC] Mirroring Google Sheet import to Master Sheet: ${masterSheet.name}`);
            const startPos = await Customer.countDocuments({ spreadsheet_id: masterSheet._id });
            const masterCustomers = insertedCustomers.map((c, idx) => {
              const { id, _id, spreadsheet_id, ...rest } = c.toObject();
              return {
                ...rest,
                spreadsheet_id: masterSheet._id,
                position: startPos + idx
              };
            });
            await Customer.insertMany(masterCustomers);
          }
        }
      } catch (dbError) {
        console.error('Database error during Google Sheets import:', dbError);
        throw new Error(`Database validation failed: ${dbError.message}`);
      }
    }

    res.json({
      success: true,
      imported: customers.length,
      message: `Successfully imported ${customers.length} customers`
    });

  } catch (error) {
    console.error('Error importing Google Sheets data:', error);
    res.status(500).json({ message: error.message || 'Failed to import data' });
  }
});

// Helper method to get mapped value from row
function getMappedValue(row, headers, mapping) {
  if (!mapping || mapping === '' || mapping === 'no-import') return '';

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