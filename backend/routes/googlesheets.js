import express from 'express';
import googleSheetsService from '../services/googleSheetsService.js';
import Customer from '../models/Customer.js';
import Spreadsheet from '../models/Spreadsheet.js';
import auth from '../middleware/auth.js';
import { syncToGoogleSheets } from '../services/syncService.js';

const router = express.Router();

/**
 * Resolves a field value for a customer, falling back to meta_data for standard fields
 * if the primary field is empty or generic (e.g., "Meta Lead").
 */
const resolveCustomerValue = (customer, fieldName) => {
  // Convert Map to Object if needed for easier access
  const meta = customer.meta_data instanceof Map ? Object.fromEntries(customer.meta_data) : (customer.meta_data || {});

  if (fieldName === 'customer_name') {
    let val = customer.customer_name || '';
    if ((!val || val === 'Meta Lead') && meta) {
      // Priority list for resolving names from Meta Ads
      val = meta.full_name || meta.name || meta.first_name || meta.Customer_Name || val;
    }
    return val;
  }

  if (fieldName === 'phone_number') {
    let val = customer.phone_number || '';
    if ((!val || val === 'N/A' || val.length < 5) && meta) {
      val = meta.phone_number || meta.phone || meta.mobile || meta.contact || val;
    }
    return val;
  }

  if (fieldName === 'company_name') {
    let val = customer.company_name || '';
    if ((!val || val === 'N/A' || val === 'Meta Ads') && meta) {
      val = meta.company_name || meta.company || val;
    }
    return val;
  }

  // Standard fields
  if (customer[fieldName] !== undefined && fieldName !== 'meta_data') {
    return customer[fieldName] || '';
  }

  // If not a standard field, check meta_data directly (for custom headers)
  if (meta[fieldName] !== undefined) {
    return meta[fieldName] || '';
  }

  return '';
};


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
      range = `${sheetName}!A${startRow}:AZ${endRow}`;
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

    // Move deletion to after parsing, but for now we'll collect customers first.
    // We will delete only if we actually have leads to replace them with.

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

    // Get starting position for new customers
    let startPosition = 0;
    if (req.body.overwrite) {
      // If overwriting, we'll keep Meta leads. New leads should start after the last preserved Meta lead.
      const lastMetaLead = await Customer.findOne({
        spreadsheet_id: spreadsheetId,
        'meta_data.meta_lead_id': { $exists: true }
      }).sort({ position: -1 });
      startPosition = lastMetaLead ? lastMetaLead.position + 1 : 0;
    } else {
      // If appending, just start after the very last lead
      const lastCustomer = await Customer.findOne({ spreadsheet_id: spreadsheetId }).sort({ position: -1 });
      startPosition = lastCustomer ? lastCustomer.position + 1 : 0;
    }

    // Map and import customers
    const customers = [];
    const headers = finalHeaders;
    const data = finalData;

    for (const row of data) {
      if (row.length === 0 || row.every(cell => !cell)) continue; // Skip empty rows

      const customer = {
        user_id: req.user.id,
        business_id: spreadsheet.business_id,
        spreadsheet_id: spreadsheetId,
        customer_name: getMappedValue(row, headers, columnMapping.customerName),
        company_name: getMappedValue(row, headers, columnMapping.companyName),
        phone_number: getMappedValue(row, headers, columnMapping.phoneNumber),
        remark: getMappedValue(row, headers, columnMapping.remarks) || '',
        next_call_date: getMappedValue(row, headers, columnMapping.nextCallDate) || new Date().toISOString().split('T')[0],
        next_call_time: getMappedValue(row, headers, columnMapping.nextCallTime) || '',
        last_call_date: getMappedValue(row, headers, columnMapping.lastCallDate) || '',
        position: startPosition + customers.length // Maintain order and append correctly
      };

      // Handle dynamic meta_data for Meta spreadsheets first so rescue logic can use it
      if (spreadsheet.is_meta && spreadsheet.meta_headers && spreadsheet.meta_headers.length > 0) {
        customer.meta_data = {};
        spreadsheet.meta_headers.forEach(header => {
          // First check if there's an explicit mapping for this header
          const mappingHeader = columnMapping[header] || header;
          const val = getMappedValue(row, headers, mappingHeader);
          if (val) {
            customer.meta_data[header] = val;
          }
        });
      }

      if (customer.customer_name || customer.phone_number) {
        // Fallback for company_name which is required but might be missing in some rows
        if (!customer.company_name) customer.company_name = 'N/A';
        // Fallback for name/phone if one is present but other is missing
        if (!customer.customer_name) customer.customer_name = 'Unknown';
        if (!customer.phone_number) customer.phone_number = 'N/A';

        customers.push(customer);
      } else if (spreadsheet.is_meta && customer.meta_data && Object.keys(customer.meta_data).length > 0) {
        // RESCUE: If it's a Meta sheet and we have meta_data, but standard fields were skipped in mapping
        // Try to find name/phone in meta_data
        let foundName = '';
        let foundPhone = '';

        for (const [key, val] of Object.entries(customer.meta_data)) {
          const lKey = key.toLowerCase();
          if (!foundName && (lKey.includes('name') || lKey.includes('customer'))) foundName = val;
          if (!foundPhone && (lKey.includes('phone') || lKey.includes('mobile') || lKey.includes('tel') || lKey.includes('contact'))) foundPhone = val;
        }

        customer.customer_name = foundName || 'Meta Lead';
        customer.phone_number = foundPhone || 'N/A';
        customer.company_name = customer.company_name || 'N/A';

        customers.push(customer);
      }
    }

    // Now safely delete and insert if we have data
    if (customers.length > 0) {
      try {
        if (req.body.overwrite) {
          // SELECTIVE OVERWRITE: Only delete manual leads, keep Meta automated leads
          await Customer.deleteMany({
            spreadsheet_id: spreadsheetId,
            'meta_data.meta_lead_id': { $exists: false }
          });
        }

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

// Export to Google Sheets
router.post('/export', auth, async (req, res) => {
  try {
    const { spreadsheetId, sheetUrl, sheetName } = req.body;

    if (!spreadsheetId || !sheetUrl) {
      return res.status(400).json({ message: 'Spreadsheet ID and Sheet URL are required' });
    }

    // 1. Verify access
    const spreadsheet = await Spreadsheet.findById(spreadsheetId);
    if (!spreadsheet) return res.status(404).json({ message: 'Spreadsheet not found' });

    // Admin or Owner/Assigned check
    const isOwner = spreadsheet.user_id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isAssigned = spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id);

    if (!isAdmin && !isOwner && !isAssigned) {
      // Check Sharing
      const Sharing = (await import('../models/Sharing.js')).default;
      const sharing = await Sharing.findOne({
        spreadsheet_id: spreadsheetId,
        shared_with_user_id: req.user.id,
        permission_level: 'read-write'
      });
      if (!sharing) return res.status(403).json({ message: 'You do not have write access to this spreadsheet' });
    }

    // 2. Fetch all customers
    const customers = await Customer.find({
      spreadsheet_id: spreadsheetId,
      is_deleted: { $ne: true }
    }).sort({ position: 1 });

    // 3. Format data for Google Sheets based on mapping if provided
    const mapping = req.body.columnMapping;
    let headers = [];
    let dataRows = [];

    console.log('[EXPORT DEBUG] Raw columnMapping from frontend:', JSON.stringify(mapping));
    console.log('[EXPORT DEBUG] Is Meta Sheet?', spreadsheet.is_meta);
    console.log('[EXPORT DEBUG] Meta Headers:', spreadsheet.meta_headers);

    if (mapping && Object.keys(mapping).length > 0) {
      // Use custom mapping (Dynamic)
      headers = Object.values(mapping);
      const fields = Object.keys(mapping);

      console.log('[EXPORT DEBUG] Using custom mapping');
      console.log('[EXPORT DEBUG] Fields to export:', fields);
      console.log('[EXPORT DEBUG] Headers to export:', headers);

      dataRows = customers.map(c => {
        return fields.map(field => resolveCustomerValue(c, field));
      });
    } else {
      // Fallback: Use ONLY meta_headers if available. 
      // We do NOT force standard headers anymore.
      if (spreadsheet.meta_headers && spreadsheet.meta_headers.length > 0) {
        headers = [...spreadsheet.meta_headers];

        console.log('[EXPORT DEBUG] Using fallback meta_headers:', headers);

        dataRows = customers.map(c => {
          const row = [];
          spreadsheet.meta_headers.forEach(h => {
            row.push(resolveCustomerValue(c, h));
          });
          return row;
        });
      } else {
        // Absolute failsafe if nothing is defined: Export just Name/Phone to avoid empty sheet error
        console.log('[EXPORT DEBUG] Using absolute failsafe (Name/Phone only)');
        headers = ['Customer Name', 'Phone Number'];
        dataRows = customers.map(c => [
          resolveCustomerValue(c, 'customer_name'),
          resolveCustomerValue(c, 'phone_number')
        ]);
      }
    }

    console.log('[EXPORT DEBUG] FINAL headers being sent to Google:', headers);
    const finalData = [headers, ...dataRows];

    // 4. Update the spreadsheet with sync settings and URL
    spreadsheet.linked_google_sheet_url = sheetUrl;
    spreadsheet.linked_sheet_name = sheetName || '';
    if (req.body.columnMapping) {
      spreadsheet.column_mapping = req.body.columnMapping;
    }
    if (req.body.realtimeSync !== undefined) {
      spreadsheet.realtime_sync = req.body.realtimeSync;
    }
    spreadsheet.updated_at = Date.now();
    await spreadsheet.save();

    // 5. Perform the final export
    console.log(`[SHEETS] Exporting ${customers.length} rows to ${sheetUrl} [${sheetName || 'First Sheet'}]...`);
    await googleSheetsService.updateSheetData(sheetUrl, finalData, sheetName);

    res.json({
      success: true,
      message: `Successfully exported ${customers.length} total leads to Google Sheets.`,
      url: sheetUrl
    });

  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    res.status(500).json({ message: error.message || 'Failed to export data' });
  }
});

// Manual Sync trigger
router.post('/sync/:spreadsheetId', auth, async (req, res) => {
  try {
    const { spreadsheetId } = req.params;

    // 1. Verify access
    const spreadsheet = await Spreadsheet.findById(spreadsheetId);
    if (!spreadsheet) return res.status(404).json({ message: 'Spreadsheet not found' });

    // Admin or Owner/Assigned check
    const isOwner = spreadsheet.user_id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isAssigned = spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id);

    if (!isAdmin && !isOwner && !isAssigned) {
      // Check Sharing
      const Sharing = (await import('../models/Sharing.js')).default;
      const sharing = await Sharing.findOne({
        spreadsheet_id: spreadsheetId,
        shared_with_user_id: req.user.id,
        permission_level: 'read-write'
      });
      if (!sharing) return res.status(403).json({ message: 'You do not have write access to this spreadsheet' });
    }

    // Perform sync (force bypasses realtime_sync flag)
    await syncToGoogleSheets(spreadsheetId, true);

    res.json({ success: true, message: 'Synchronization triggered successfully' });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ message: error.message || 'Failed to trigger sync' });
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