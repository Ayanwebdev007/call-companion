import express from 'express';
import Customer from '../models/Customer.js';
import Spreadsheet from '../models/Spreadsheet.js';
import User from '../models/User.js';
import Sharing from '../models/Sharing.js';
import auth from '../middleware/auth.js';
import checkPermission from '../middleware/permissions.js';
import XLSX from 'xlsx';
import fs from 'fs';
import { syncToGoogleSheets } from '../services/syncService.js';

const router = express.Router();

// GET all customers for logged in user (supports search)
router.get('/', auth, checkPermission('dashboard'), async (req, res) => {
  try {
    const { spreadsheetId, q } = req.query;

    console.log('Received spreadsheetId:', spreadsheetId);

    if (!spreadsheetId) {
      return res.status(400).json({ message: 'spreadsheetId is required' });
    }

    // Validate that spreadsheetId is a valid ObjectId
    const mongoose = await import('mongoose');
    if (!mongoose.default.isValidObjectId(spreadsheetId)) {
      return res.status(400).json({ message: 'Invalid spreadsheet ID' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user has access to this spreadsheet (business match + admin OR assignment)
    const spreadsheet = await Spreadsheet.findOne({ _id: spreadsheetId, business_id: user.business_id });
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found or access denied' });
    }

    // Check role or assignment
    let hasAccess = user.role === 'admin' || (spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id));

    if (!hasAccess) {
      // Check if shared with this user (legacy/external sharing support)
      const sharing = await Sharing.findOne({
        spreadsheet_id: spreadsheetId,
        shared_with_user_id: req.user.id
      });
      hasAccess = !!sharing;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this spreadsheet' });
    }

    // Build query
    const baseFilter = { spreadsheet_id: spreadsheetId, is_deleted: { $ne: true } };
    let filter = baseFilter;
    if (q && typeof q === 'string' && q.trim().length > 0) {
      // Escape regex special characters and build case-insensitive regex
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter = {
        ...baseFilter,
        $or: [
          { customer_name: regex },
          { company_name: regex },
          { phone_number: regex },
        ]
      };
    }

    const customers = await Customer.find(filter).sort({ position: 1, next_call_date: 1, next_call_time: 1 });
    res.json(customers);
  } catch (err) {
    console.error('Error loading customers:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST new customer
router.post('/', auth, checkPermission('dashboard'), async (req, res) => {
  const { spreadsheet_id, customer_name, company_name, phone_number, next_call_date, next_call_time, last_call_date, remark, color, status, meta_data } = req.body;

  if (!spreadsheet_id) {
    return res.status(400).json({ message: 'spreadsheet_id is required' });
  }

  // Validate that spreadsheet_id is a valid ObjectId
  const mongoose = await import('mongoose');
  if (!mongoose.default.isValidObjectId(spreadsheet_id)) {
    return res.status(400).json({ message: 'Invalid spreadsheet ID' });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Check if user has write access to this spreadsheet
  const spreadsheet = await Spreadsheet.findOne({ _id: spreadsheet_id, business_id: user.business_id });
  if (!spreadsheet) {
    return res.status(404).json({ message: 'Spreadsheet not found or access denied' });
  }

  // Check role or assignment (Admin or Assigned User)
  // Note: If assigned, we allow write access for now by default if they have the form.
  let hasWriteAccess = user.role === 'admin' || (spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id));

  if (!hasWriteAccess) {
    // Check if shared with this user with write permission
    const sharing = await Sharing.findOne({
      spreadsheet_id: spreadsheet_id,
      shared_with_user_id: req.user.id
    });
    hasWriteAccess = sharing && sharing.permission_level === 'read-write';
  }

  if (!hasWriteAccess) {
    return res.status(403).json({ message: 'You do not have write access to this spreadsheet' });
  }

  // First get the highest position value
  const maxPositionCustomer = await Customer.findOne({
    spreadsheet_id: spreadsheet_id
  }).sort({ position: -1 });
  const newPosition = maxPositionCustomer ? maxPositionCustomer.position + 1 : 0;

  const customer = new Customer({
    user_id: req.user.id,
    business_id: user.business_id,
    spreadsheet_id: spreadsheet_id,
    customer_name,
    company_name,
    phone_number,
    next_call_date,
    next_call_time,
    last_call_date: last_call_date || '',
    remark: remark || '',
    color: color || null,
    status: status || 'New',
    meta_data: meta_data || {},
    position: newPosition
  });

  try {
    const newCustomer = await customer.save();

    // SYNC TO MASTER SHEET
    if (spreadsheet.is_meta && !spreadsheet.is_master) {
      const masterSheet = await Spreadsheet.findOne({
        business_id: user.business_id,
        page_name: spreadsheet.page_name,
        form_name: spreadsheet.form_name,
        is_master: true
      });

      if (masterSheet) {
        console.log(`[SYNC] Mirroring manual lead to Master Sheet: ${masterSheet.name}`);
        const masterCustomer = new Customer({
          ...req.body,
          user_id: req.user.id,
          business_id: user.business_id,
          spreadsheet_id: masterSheet._id,
          position: (await Customer.countDocuments({ spreadsheet_id: masterSheet._id }))
        });
        await masterCustomer.save();
      }
    }

    // Trigger background sync to Google Sheets
    syncToGoogleSheets(spreadsheet_id);

    // REAL-TIME SYNC TO UNIFIED SHEETS
    // Mirroring Fix from Meta Webhook: Check for Unified Sheets linked to THIS sheet OR its Master Sheet
    let targetSpreadsheets = [spreadsheet_id];

    if (spreadsheet.is_meta && !spreadsheet.is_master) {
      const masterSheet = await Spreadsheet.findOne({
        business_id: user.business_id,
        page_name: spreadsheet.page_name,
        form_name: spreadsheet.form_name,
        is_master: true
      });
      if (masterSheet) {
        targetSpreadsheets.push(masterSheet._id);
      }
    }

    const unifiedSheets = await Spreadsheet.find({
      business_id: user.business_id,
      is_unified: true,
      linked_meta_sheets: { $in: targetSpreadsheets }
    });

    if (unifiedSheets.length > 0) {
      console.log(`[SYNC] Propagating new manual lead to ${unifiedSheets.length} Unified Sheets`);
      const unifiedCopies = unifiedSheets.map(unifiedSheet => ({
        ...req.body,
        user_id: req.user.id,
        business_id: user.business_id,
        spreadsheet_id: unifiedSheet._id,
        created_at: new Date(),
        updated_at: new Date(),
        position: 0,
        meta_data: {
          ...meta_data,
          is_unified_copy: true,
          source_spreadsheet_id: spreadsheet_id,
          source_customer_id: newCustomer._id
        }
      }));
      await Customer.insertMany(unifiedCopies);
    }

    // REAL-TIME SYNC TO META SHEETS (WRITE-BACK)
    // If adding to a Unified Sheet, write back to the specific linked Source Sheet if requested, or the first one
    if (spreadsheet.is_unified && spreadsheet.linked_meta_sheets && spreadsheet.linked_meta_sheets.length > 0) {
      try {
        let targetSourceId = spreadsheet.linked_meta_sheets[0];

        // If specific source sheet requested (e.g. from UI selector), use that
        if (meta_data && meta_data.source_spreadsheet_id) {
          const requestedId = meta_data.source_spreadsheet_id.toString();
          if (spreadsheet.linked_meta_sheets.map(id => id.toString()).includes(requestedId)) {
            targetSourceId = requestedId;
          }
        }

        console.log(`[SYNC] Writing back new Unified lead to Source Sheet: ${targetSourceId}`);

        // Calculate position for the source sheet
        const sourceMaxPos = await Customer.findOne({ spreadsheet_id: targetSourceId }).sort({ position: -1 });
        const sourcePosition = sourceMaxPos ? sourceMaxPos.position + 1 : 0;

        // Create the source lead using VALIDATED variables from scope, NOT raw req.body
        const sourceCustomer = new Customer({
          user_id: req.user.id,
          business_id: user.business_id,
          spreadsheet_id: targetSourceId,
          customer_name,
          company_name,
          phone_number,
          next_call_date,
          next_call_time,
          last_call_date: last_call_date || '',
          remark: remark || '',
          color: color || null,
          status: status || 'New',
          position: sourcePosition,
          created_at: new Date(),
          updated_at: new Date(),
          // Ensure we don't accidentally mark it as a unified copy
          meta_data: {
            ...meta_data,
            is_unified_copy: false
          }
        });

        const savedSourceCustomer = await sourceCustomer.save();

        // LINK the Unified Lead to this new Source Lead
        // We must update the lead we just responded with
        newCustomer.meta_data = {
          ...newCustomer.meta_data,
          is_unified_copy: true,
          source_spreadsheet_id: targetSourceId,
          source_customer_id: savedSourceCustomer._id
        };

        // Handle Map type if necessary (though usually simple assignment works in Mongoose setters)
        if (newCustomer.meta_data instanceof Map) {
          newCustomer.meta_data.set('is_unified_copy', 'true');
          newCustomer.meta_data.set('source_spreadsheet_id', targetSourceId.toString());
          newCustomer.meta_data.set('source_customer_id', savedSourceCustomer._id.toString());
        }

        await newCustomer.save();

        // Trigger sync for the source sheet
        syncToGoogleSheets(targetSourceId);
      } catch (syncErr) {
        console.error('[SYNC ERROR] Failed to write back to source sheet:', syncErr);
        // Do not fail the request, just log
      }
    }

    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// BULK IMPORT customers from Excel
router.post('/bulk-import', auth, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { spreadsheetId, overwrite } = req.body;
    const isOverwrite = overwrite === 'true'; // Handle string from FormData
    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID is required' });
    }

    // Validate that spreadsheetId is a valid ObjectId
    const mongoose = await import('mongoose');
    if (!mongoose.default.isValidObjectId(spreadsheetId)) {
      return res.status(400).json({ message: 'Invalid spreadsheet ID' });
    }

    // Check if user has write access to this spreadsheet
    const spreadsheet = await Spreadsheet.findOne({ _id: spreadsheetId });
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    // Check role or assignment (Admin, Owner, or Assigned User)
    let hasWriteAccess = user.role === 'admin' ||
      spreadsheet.user_id.toString() === req.user.id ||
      (spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id));

    if (!hasWriteAccess) {
      // Check if shared with this user with write permission
      const sharing = await Sharing.findOne({
        spreadsheet_id: spreadsheetId,
        shared_with_user_id: req.user.id
      });
      hasWriteAccess = sharing && sharing.permission_level === 'read-write';
    }

    if (!hasWriteAccess) {
      return res.status(403).json({ message: 'You do not have write access to this spreadsheet' });
    }

    const file = req.files.file;
    let buffer;

    // Handle both buffer and temp file approaches
    if (file.data) {
      // Direct buffer approach
      buffer = Buffer.from(file.data);
    } else if (file.tempFilePath) {
      // Temp file approach
      buffer = fs.readFileSync(file.tempFilePath);
    } else {
      return res.status(400).json({ message: 'Invalid file format' });
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Debug: Log the raw data structure
    console.log('Excel data structure:', JSON.stringify(data, null, 2));

    const customers = [];
    const errors = [];

    // Normalize column names (handle case sensitivity and spacing)
    const normalizeRow = (row) => {
      const normalized = {};
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          // Convert to lowercase and remove spaces for matching
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
          normalized[normalizedKey] = row[key];
        }
      }
      return normalized;
    };

    // Get the highest position value for this spreadsheet
    let currentPosition = 0;
    if (isOverwrite) {
      // If overwriting, we keep Meta leads. New leads start after the last preserved Meta lead.
      const lastMetaLead = await Customer.findOne({
        spreadsheet_id: spreadsheetId,
        'meta_data.meta_lead_id': { $exists: true }
      }).sort({ position: -1 });
      currentPosition = lastMetaLead ? lastMetaLead.position + 1 : 0;
    } else {
      // If appending, start after the very last lead
      const maxPositionCustomer = await Customer.findOne({
        spreadsheet_id: spreadsheetId
      }).sort({ position: -1 });
      currentPosition = maxPositionCustomer ? maxPositionCustomer.position + 1 : 0;
    }

    for (let i = 0; i < data.length; i++) {
      const originalRow = data[i];
      const row = normalizeRow(originalRow);

      // Try multiple possible column names
      const customerName = row['customer_name'] || row['customername'] || row['name'] || '';
      const companyName = row['company_name'] || row['companyname'] || row['company'] || '';
      const phoneNumber = row['phone_number'] || row['phonenumber'] || row['phone'] || '';

      // Validate mandatory fields
      if (!customerName || !companyName || !phoneNumber) {
        errors.push(`Row ${i + 1}: Missing mandatory fields. Found - Name: '${customerName}', Company: '${companyName}', Phone: '${phoneNumber}'`);
        console.log(`Row ${i + 1} debug:`, JSON.stringify(row, null, 2));
        continue;
      }

      // Ensure we always have a valid date
      let nextCallDate = new Date().toISOString().split('T')[0]; // Default to today
      const nextCallDateRaw = row['next_call_date'] || row['nextcalldate'] || '';
      if (nextCallDateRaw) {
        const dateStr = nextCallDateRaw.toString().trim();
        // Validate date format
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          nextCallDate = dateStr;
        }
      }

      const customerData = {
        user_id: req.user.id,
        business_id: spreadsheet.business_id,
        spreadsheet_id: spreadsheetId,
        customer_name: customerName.toString().trim(),
        company_name: companyName.toString().trim(),
        phone_number: phoneNumber.toString().trim(),
        next_call_date: nextCallDate,
        next_call_time: (row['next_call_time'] || row['nextcalltime'] || '').toString().trim(),
        last_call_date: (row['last_call_date'] || row['lastcalldate'] || '').toString().trim(),
        remark: (row['remark'] || '').toString().trim(),
        color: null, // Default to null for imported customers
        status: 'New', // Default status for imported customers
        position: currentPosition++
      };

      // Handle dynamic meta_data for Meta spreadsheets
      if (spreadsheet.is_meta && spreadsheet.meta_headers && spreadsheet.meta_headers.length > 0) {
        customerData.meta_data = {};
        spreadsheet.meta_headers.forEach(header => {
          // Find value in normalized row that matches the header
          const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');
          if (row[normalizedHeader] !== undefined) {
            customerData.meta_data[header] = row[normalizedHeader].toString().trim();
          }
        });
      }

      customers.push(customerData);
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation errors', errors });
    }

    // Handle selective overwrite if requested
    if (isOverwrite) {
      // Delete only manual leads (those without meta_lead_id)
      await Customer.deleteMany({
        spreadsheet_id: spreadsheetId,
        'meta_data.meta_lead_id': { $exists: false }
      });
    }

    // Insert all customers
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
        console.log(`[SYNC] Mirroring bulk import to Master Sheet: ${masterSheet.name}`);
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

    res.status(201).json({
      customers: insertedCustomers
    });

    // Trigger background sync to Google Sheets
    syncToGoogleSheets(spreadsheetId);
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ message: 'Error importing customers', error: err.message });
  }
});

// DOWNLOAD Excel template
router.get('/download-template', auth, async (req, res) => {
  try {
    const { spreadsheetId } = req.query;
    let templateData = [];

    // Default headers
    let headers = [
      'customer_name',
      'company_name',
      'phone_number',
      'last_call_date',
      'next_call_date',
      'next_call_time',
      'remark',
      'color'
    ];

    // If spreadsheetId is provided, check for dynamic headers
    if (spreadsheetId) {
      // Validate that spreadsheetId is a valid ObjectId
      const mongoose = await import('mongoose');
      if (mongoose.default.isValidObjectId(spreadsheetId)) {
        const spreadsheet = await Spreadsheet.findById(spreadsheetId);

        if (spreadsheet && spreadsheet.is_meta && spreadsheet.meta_headers && spreadsheet.meta_headers.length > 0) {
          // Use dynamic headers for Meta spreadsheets
          headers = spreadsheet.meta_headers;
        }
      }
    }

    // Create a single row object with empty values (or example values)
    const row = {};
    headers.forEach(header => {
      // Provide some example data for standards fields to guide the user
      switch (header) {
        case 'customer_name': row[header] = 'John Doe'; break;
        case 'company_name': row[header] = 'ABC Company'; break;
        case 'phone_number': row[header] = '+1234567890'; break;
        case 'last_call_date': row[header] = '2023-12-20'; break;
        case 'next_call_date': row[header] = '2023-12-25'; break;
        case 'next_call_time': row[header] = '14:30'; break;
        case 'remark': row[header] = 'Important client'; break;
        case 'color': row[header] = ''; break;
        default: row[header] = ''; // Empty for dynamic/unknown fields
      }
    });

    templateData.push(row);

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Convert buffer for proper sending
    const bufferArray = Buffer.from(buffer);

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="customers_template.xlsx"');

    // Send the buffer
    res.send(bufferArray);
  } catch (err) {
    console.error('Template generation error:', err);
    res.status(500).json({ message: 'Error generating template', error: err.message });
  }
});

// EXPORT customer data for a specific spreadsheet
router.get('/export/:spreadsheetId', auth, async (req, res) => {
  try {
    const { spreadsheetId } = req.params;

    // Validate spreadsheetId
    if (!spreadsheetId || spreadsheetId === 'undefined') {
      return res.status(400).json({ message: 'Valid spreadsheet ID is required' });
    }

    // Check if user has access to this spreadsheet (either owner or shared with access)
    const spreadsheet = await Spreadsheet.findById(spreadsheetId);
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    // Check ownership or sharing permissions
    const isOwner = spreadsheet.user_id.toString() === req.user.id;
    const sharedRecord = await Sharing.findOne({
      spreadsheet_id: spreadsheetId,
      shared_with_user_id: req.user.id
    });

    if (!isOwner && !sharedRecord) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch customers for this spreadsheet
    const customers = await Customer.find({ spreadsheet_id: spreadsheetId }).sort({ createdAt: 1 });

    // Transform customer data for export
    const exportData = customers.map(customer => {
      // Handle date conversion safely
      let lastCallDate = '';
      if (customer.last_call_date) {
        if (customer.last_call_date instanceof Date) {
          lastCallDate = customer.last_call_date.toISOString().split('T')[0];
        } else if (typeof customer.last_call_date === 'string') {
          // If it's already a string, use it as is
          lastCallDate = customer.last_call_date;
        } else {
          // Try to convert to date
          const date = new Date(customer.last_call_date);
          if (!isNaN(date.getTime())) {
            lastCallDate = date.toISOString().split('T')[0];
          }
        }
      }

      let nextCallDate = '';
      if (customer.next_call_date) {
        if (customer.next_call_date instanceof Date) {
          nextCallDate = customer.next_call_date.toISOString().split('T')[0];
        } else if (typeof customer.next_call_date === 'string') {
          // If it's already a string, use it as is
          nextCallDate = customer.next_call_date;
        } else {
          // Try to convert to date
          const date = new Date(customer.next_call_date);
          if (!isNaN(date.getTime())) {
            nextCallDate = date.toISOString().split('T')[0];
          }
        }
      }

      const dataRow = {
        'customer_name': customer.customer_name || '',
        'company_name': customer.company_name || '',
        'phone_number': customer.phone_number || '',
        'last_call_date': lastCallDate,
        'next_call_date': nextCallDate,
        'next_call_time': customer.next_call_time || '',
        'remark': customer.remark || '',
        'color': customer.color || ''
      };

      // Add dynamic headers if it's a Meta spreadsheet
      if (spreadsheet.is_meta && spreadsheet.meta_headers) {
        spreadsheet.meta_headers.forEach(header => {
          let value = '';
          if (customer.meta_data) {
            if (customer.meta_data instanceof Map) {
              value = customer.meta_data.get(header) || '';
            } else {
              value = customer.meta_data[header] || '';
            }
          }
          dataRow[header] = value;
        });
      }

      return dataRow;
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Convert buffer for proper sending
    const bufferArray = Buffer.from(buffer);

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${spreadsheet.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.xlsx"`);

    // Send the buffer
    res.send(bufferArray);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'Error exporting data', error: err.message });
  }
});

// UPDATE customer
router.put('/:id', auth, async (req, res) => {
  try {
    // First find the customer to get its spreadsheet_id
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Ensure customer belongs to user's business
    if (customer.business_id.toString() !== user.business_id.toString()) {
      return res.status(403).json({ message: 'Access denied: Customer belongs to another business' });
    }

    // Check if user has write access to this spreadsheet
    const spreadsheet = await Spreadsheet.findOne({ _id: customer.spreadsheet_id, business_id: user.business_id });
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    // Check role or assignment (Admin or Assigned User)
    let hasWriteAccess = user.role === 'admin' || (spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id));

    if (!hasWriteAccess) {
      // Check if shared with this user with write permission
      const sharing = await Sharing.findOne({
        spreadsheet_id: customer.spreadsheet_id,
        shared_with_user_id: req.user.id
      });
      hasWriteAccess = sharing && sharing.permission_level === 'read-write';
    }

    if (!hasWriteAccess) {
      return res.status(403).json({ message: 'You do not have write access to this spreadsheet' });
    }

    // Prevent overwriting of 'meta_data' hidden flags (source_customer_id, etc.) if frontend sends partial meta_data
    let updatePayload = { ...req.body };

    if (updatePayload.meta_data) {
      const existingDoc = await Customer.findOne({ _id: req.params.id, business_id: user.business_id });
      if (existingDoc && existingDoc.meta_data) {
        // Merge existing hidden flags into the payload's meta_data
        const existingMeta = existingDoc.meta_data instanceof Map ? Object.fromEntries(existingDoc.meta_data) : existingDoc.meta_data;
        const newMeta = { ...existingMeta, ...updatePayload.meta_data };

        // Ensure we keep the flags if they existed
        if (existingDoc.meta_data instanceof Map) {
          if (existingDoc.meta_data.has('is_unified_copy')) newMeta.is_unified_copy = existingDoc.meta_data.get('is_unified_copy');
          if (existingDoc.meta_data.has('source_customer_id')) newMeta.source_customer_id = existingDoc.meta_data.get('source_customer_id');
          if (existingDoc.meta_data.has('source_spreadsheet_id')) newMeta.source_spreadsheet_id = existingDoc.meta_data.get('source_spreadsheet_id');
          if (existingDoc.meta_data.has('meta_lead_id')) newMeta.meta_lead_id = existingDoc.meta_data.get('meta_lead_id');
        } else {
          if (existingMeta.is_unified_copy) newMeta.is_unified_copy = existingMeta.is_unified_copy;
          if (existingMeta.source_customer_id) newMeta.source_customer_id = existingMeta.source_customer_id;
          if (existingMeta.source_spreadsheet_id) newMeta.source_spreadsheet_id = existingMeta.source_spreadsheet_id;
          if (existingMeta.meta_lead_id) newMeta.meta_lead_id = existingMeta.meta_lead_id;
        }

        updatePayload.meta_data = newMeta;
      }

      // AUTO-MAPPING: Sync meta_data dynamic fields to top-level standard fields
      if (spreadsheet.column_mapping) {
        Object.entries(spreadsheet.column_mapping).forEach(([header, field]) => {
          if (updatePayload.meta_data[header] !== undefined) {
            updatePayload[field] = updatePayload.meta_data[header];
          }
        });
      }
    }

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: req.params.id, business_id: user.business_id },
      updatePayload,
      { new: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // SYNC: Comprehensive Synchronization Logic
    // 1. Sync across Meta Sheets (based on meta_lead_id)
    // 2. Sync Downstream: Source -> Unified (based on source_customer_id)
    // 3. Sync Upstream: Unified -> Source (based on source_customer_id)

    const syncUpdate = {
      customer_name: updatedCustomer.customer_name,
      company_name: updatedCustomer.company_name,
      phone_number: updatedCustomer.phone_number,
      status: updatedCustomer.status,
      remark: updatedCustomer.remark,
      color: updatedCustomer.color,
      next_call_date: updatedCustomer.next_call_date,
      next_call_time: updatedCustomer.next_call_time,
      last_call_date: updatedCustomer.last_call_date
    };

    console.log(`[SYNC] Propagating update for Customer ${updatedCustomer._id} (${updatedCustomer.customer_name})`);

    const syncPromises = [];

    // Case 1: Meta Lead Sync (for duplicates across sheets with same Meta ID)
    let metaLeadId = null;
    if (updatedCustomer.meta_data) {
      if (updatedCustomer.meta_data instanceof Map) {
        metaLeadId = updatedCustomer.meta_data.get('meta_lead_id') || updatedCustomer.meta_data.get('meta_id');
      } else {
        metaLeadId = updatedCustomer.meta_data.meta_lead_id || updatedCustomer.meta_data.meta_id;
      }
    }

    if (metaLeadId) {
      console.log(`[SYNC] .. matching Meta Lead ID: ${metaLeadId}`);
      syncPromises.push(
        Customer.updateMany(
          {
            business_id: updatedCustomer.business_id,
            'meta_data.meta_lead_id': metaLeadId,
            _id: { $ne: updatedCustomer._id }
          },
          { $set: syncUpdate }
        )
      );
    }

    // Case 2: Downstream Sync (This is a Source Lead, update its Unified copies)
    // Find all customers where source_customer_id matches this customer's ID (check both string and ObjectId)
    syncPromises.push(
      Customer.updateMany(
        {
          business_id: updatedCustomer.business_id,
          $or: [
            { 'meta_data.source_customer_id': updatedCustomer._id.toString() },
            { 'meta_data.source_customer_id': updatedCustomer._id }
          ]
        },
        { $set: syncUpdate }
      ).then(res => {
        if (res.modifiedCount > 0) console.log(`[SYNC] .. updated ${res.modifiedCount} downstream Unified copies.`);
      })
    );


    // Case 3: Upstream Sync (This is a Unified Copy, update its Source Original)
    let sourceCustomerId = null;
    if (updatedCustomer.meta_data) {
      if (updatedCustomer.meta_data instanceof Map) {
        sourceCustomerId = updatedCustomer.meta_data.get('source_customer_id');
      } else {
        sourceCustomerId = updatedCustomer.meta_data.source_customer_id;
      }
    }

    if (sourceCustomerId) {
      console.log(`[SYNC] .. matching Source Customer ID: ${sourceCustomerId}`);
      syncPromises.push(
        Customer.updateOne(
          {
            _id: sourceCustomerId, // It's a direct ID lookup (Mongoose handles ObjectId casting)
            business_id: updatedCustomer.business_id
          },
          { $set: syncUpdate }
        ).then(res => {
          if (res.modifiedCount > 0) console.log(`[SYNC] .. updated Source Original.`);
        })
      );
    }

    await Promise.all(syncPromises);

    // Trigger background sync to Google Sheets
    syncToGoogleSheets(updatedCustomer.spreadsheet_id);

    res.json(updatedCustomer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// DELETE customer
router.delete('/:id', auth, async (req, res) => {
  try {
    // First find the customer to get its spreadsheet_id
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user has write access to this spreadsheet
    const spreadsheet = await Spreadsheet.findOne({ _id: customer.spreadsheet_id, business_id: user.business_id });
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    // Check role or assignment (Admin, Owner, or Assigned User)
    let hasWriteAccess = user.role === 'admin' ||
      spreadsheet.user_id.toString() === req.user.id ||
      (spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id));

    if (!hasWriteAccess) {
      // Check if shared with this user with write permission
      const sharing = await Sharing.findOne({
        spreadsheet_id: customer.spreadsheet_id,
        shared_with_user_id: req.user.id
      });
      hasWriteAccess = sharing && sharing.permission_level === 'read-write';
    }

    if (!hasWriteAccess) {
      return res.status(403).json({ message: 'You do not have write access to this spreadsheet' });
    }

    const deletedCustomer = await Customer.findOneAndUpdate(
      { _id: req.params.id, business_id: user.business_id },
      { is_deleted: true, deleted_at: new Date() },
      { new: true }
    );
    if (!deletedCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    // Trigger background sync to Google Sheets
    syncToGoogleSheets(deletedCustomer.spreadsheet_id);

    // REAL-TIME SYNC TO UNIFIED SHEETS

    // Safely convert to POJO to access meta_data Map
    const customerObj = deletedCustomer.toObject({ flattenMaps: true });

    // Direct Map access attempt
    let isUnifiedMap = false;
    let rankSourceId = undefined;
    if (deletedCustomer.meta_data && typeof deletedCustomer.meta_data.get === 'function') {
      const val = deletedCustomer.meta_data.get('is_unified_copy');
      isUnifiedMap = val === 'true' || val === true;
      rankSourceId = deletedCustomer.meta_data.get('source_customer_id');
    }

    const isUnifiedFlat = customerObj.meta_data?.is_unified_copy === true || customerObj.meta_data?.is_unified_copy === 'true';
    const sourceCustomerId = customerObj.meta_data?.source_customer_id || rankSourceId;
    const sourceSpreadsheetId = customerObj.meta_data?.source_spreadsheet_id;

    const isUnifiedCopy = isUnifiedMap || isUnifiedFlat || (!!sourceCustomerId) || (!!sourceSpreadsheetId);

    // Case 1: Deleted Source Lead -> Delete Copies
    if (!isUnifiedCopy) {
      // Strategy A: Try to delete by source_customer_id (Best for new leads)
      const primaryResult = await Customer.updateMany(
        {
          business_id: user.business_id,
          $or: [
            { 'meta_data.source_customer_id': deletedCustomer._id.toString() },
            { 'meta_data.source_customer_id': deletedCustomer._id }
          ]
        },
        { is_deleted: true, deleted_at: new Date() }
      );

      if (primaryResult.modifiedCount > 0) {
        console.log(`[SYNC] Deleted ${primaryResult.modifiedCount} downstream Unified copies.`);
      }

      // Strategy B: Fallback for older leads (Missing source_customer_id)
      if (primaryResult.modifiedCount === 0) {
        console.log('[SYNC] No linked ID found, trying fallback matching for deletion...');
        await Customer.updateMany(
          {
            business_id: user.business_id,
            'meta_data.is_unified_copy': true,
            'meta_data.source_spreadsheet_id': deletedCustomer.spreadsheet_id,
            phone_number: deletedCustomer.phone_number,
            customer_name: deletedCustomer.customer_name
          },
          { is_deleted: true, deleted_at: new Date() }
        );
      }
    } else if (isUnifiedCopy && sourceCustomerId) {
      // CASE 2: Unified Copy Deleted -> Delete Source
      console.log(`[SYNC] Deleting Source Lead because Unified Copy was deleted: ${sourceCustomerId}`);
      await Customer.updateOne(
        { _id: sourceCustomerId },
        {
          is_deleted: true,
          deleted_at: new Date()
        }
      );
    }

    res.json({ message: 'Customer deleted (soft)' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// BULK DELETE customers (Soft Delete)
router.post('/bulk-delete', auth, async (req, res) => {
  try {
    console.log('Bulk delete request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID:', req.user.id);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.log('No customer IDs provided or invalid format');
      return res.status(400).json({ message: 'No customer IDs provided' });
    }

    console.log('Deleting customers with IDs:', ids);
    console.log('User ID for query:', req.user.id);

    // Validate that all IDs are valid ObjectIds
    const mongoose = await import('mongoose');
    const validIds = ids.filter(id => mongoose.default.isValidObjectId(id));
    console.log('Valid IDs:', validIds);
    console.log('Invalid IDs:', ids.filter(id => !mongoose.default.isValidObjectId(id)));

    if (validIds.length === 0) {
      return res.status(400).json({ message: 'No valid customer IDs provided' });
    }

    // Check if user has write access to all these customers
    const customers = await Customer.find({ _id: { $in: validIds } });

    // Group customers by spreadsheet_id
    const spreadsheetIds = [...new Set(customers.map(c => c.spreadsheet_id.toString()))];

    // Check access for each spreadsheet
    for (const spreadsheetId of spreadsheetIds) {
      const spreadsheet = await Spreadsheet.findById(spreadsheetId);
      if (!spreadsheet) {
        continue;
      }

      // Check role or assignment (Admin, Owner, or Assigned User)
      let hasWriteAccess = user.role === 'admin' ||
        spreadsheet.user_id.toString() === req.user.id ||
        (spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id));

      if (!hasWriteAccess) {
        // Check if shared with this user with write permission
        const sharing = await Sharing.findOne({
          spreadsheet_id: spreadsheetId,
          shared_with_user_id: req.user.id
        });
        hasWriteAccess = sharing && sharing.permission_level === 'read-write';
      }

      if (!hasWriteAccess) {
        return res.status(403).json({ message: `You do not have write access to spreadsheet ${spreadsheet.name || spreadsheetId}` });
      }
    }

    // Capture customers for sync before deletion
    let customersToSync = [];
    try {
      customersToSync = await Customer.find({
        _id: { $in: validIds }
      });
      console.log('Customers to delete (before deletion):', customersToSync.length);
    } catch (checkErr) {
      console.error('Error checking customers before deletion:', checkErr);
    }

    const result = await Customer.updateMany(
      {
        _id: { $in: validIds },
        business_id: user.business_id
      },
      {
        $set: { is_deleted: true, deleted_at: new Date() }
      }
    );

    console.log('Delete result:', result);

    // SYNC DELETION: Propagate to Linked Copies/Sources
    try {
      console.log('[SYNC BULK DELETE] Propagating deletions...');
      for (const deletedCustomer of customersToSync) {
        const customerObj = deletedCustomer.toObject({ flattenMaps: true });

        // Check if Unified Copy
        let isUnifiedCopy = false;
        let sourceCustomerId = undefined;

        if (customerObj.meta_data) {
          // Handle Map or Object safely
          let meta = customerObj.meta_data;
          if (customerObj.meta_data instanceof Map) {
            meta = Object.fromEntries(customerObj.meta_data);
          }

          isUnifiedCopy = meta.is_unified_copy === 'true' || meta.is_unified_copy === true;
          sourceCustomerId = meta.source_customer_id;
        }

        if (isUnifiedCopy && sourceCustomerId) {
          // Case A: Unified Copy Deleted -> Delete Source
          console.log(`[SYNC BULK DELETE] Deleting Source Lead ${sourceCustomerId}`);
          await Customer.updateOne({ _id: sourceCustomerId }, { $set: { is_deleted: true, deleted_at: new Date() } });
        } else {
          // Case B: Source Lead Deleted -> Delete Copies
          console.log(`[SYNC BULK DELETE] Deleting Unified Copies for Source ${deletedCustomer._id}`);
          await Customer.updateMany(
            { 'meta_data.source_customer_id': deletedCustomer._id.toString() },
            { $set: { is_deleted: true, deleted_at: new Date() } }
          );
        }
      }
    } catch (syncErr) {
      console.error('Bulk Delete Sync Error:', syncErr);
    }

    // Trigger background sync for affected spreadsheets
    spreadsheetIds.forEach(sid => syncToGoogleSheets(sid));

    res.json({
      message: `${result.modifiedCount || 0} customers deleted successfully`,
      deletedCount: result.modifiedCount || 0
    });
  } catch (err) {
    console.error('Bulk delete error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Error deleting customers', error: err.message });
  }
});

// POST bulk insert (for Undo restoration/Import)
router.post('/bulk-insert', auth, async (req, res) => {
  try {
    const { spreadsheetId, customers } = req.body;

    if (!spreadsheetId || !customers || !Array.isArray(customers)) {
      return res.status(400).json({ message: 'spreadsheetId and customers array are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const spreadsheet = await Spreadsheet.findOne({ _id: spreadsheetId, business_id: user.business_id });
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found or access denied' });
    }

    // Check write access (Admin, Owner, or Assigned User)
    let hasWriteAccess = user.role === 'admin' ||
      spreadsheet.user_id.toString() === req.user.id ||
      (spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id));

    if (!hasWriteAccess) {
      const sharing = await Sharing.findOne({
        spreadsheet_id: spreadsheetId,
        shared_with_user_id: req.user.id
      });
      hasWriteAccess = sharing && sharing.permission_level === 'read-write';
    }

    if (!hasWriteAccess) {
      return res.status(403).json({ message: 'You do not have write access to this spreadsheet' });
    }

    // Prepare customers for insertion (ensure correct business_id and spreadsheet_id)
    const customersToInsert = customers.map(c => {
      const { id, _id, ...rest } = c;
      return {
        ...rest,
        spreadsheet_id: spreadsheetId,
        business_id: user.business_id,
        user_id: req.user.id
      };
    });

    const insertedCustomers = await Customer.insertMany(customersToInsert);

    // Sync to Master Sheet if applicable
    if (spreadsheet.is_meta && !spreadsheet.is_master) {
      const masterSheet = await Spreadsheet.findOne({
        business_id: spreadsheet.business_id,
        page_name: spreadsheet.page_name,
        form_name: spreadsheet.form_name,
        is_master: true
      });

      if (masterSheet) {
        console.log(`[SYNC] Mirroring bulk-insert to Master Sheet: ${masterSheet.name}`);
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

    res.status(201).json({
      message: `${insertedCustomers.length} leads restored successfully`,
      count: insertedCustomers.length
    });
  } catch (err) {
    console.error('Bulk insert error:', err);
    res.status(500).json({ message: 'Error restoring leads', error: err.message });
  }
});

// RESTORE customer (Soft Delete Reversal)
router.post('/restore/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check write access (Admin, Owner, or Assigned User)
    const spreadsheet = await Spreadsheet.findById(customer.spreadsheet_id);
    let hasWriteAccess = user.role === 'admin' ||
      (spreadsheet && spreadsheet.user_id.toString() === user.id) ||
      (spreadsheet && spreadsheet.assigned_users && spreadsheet.assigned_users.includes(user.id));

    if (!hasWriteAccess && spreadsheet) {
      const sharing = await Sharing.findOne({
        spreadsheet_id: spreadsheet._id,
        shared_with_user_id: user.id
      });
      hasWriteAccess = sharing && sharing.permission_level === 'read-write';
    }

    if (!hasWriteAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const restoredCustomer = await Customer.findOneAndUpdate(
      { _id: req.params.id },
      { is_deleted: false, deleted_at: null },
      { new: true }
    );

    // Trigger background sync to Google Sheets
    syncToGoogleSheets(restoredCustomer.spreadsheet_id);

    res.json({ message: 'Customer restored', customer: restoredCustomer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// BULK RESTORE customers
router.post('/bulk-restore', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ message: 'IDs array required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // For bulk restore, we need to check if user has access to ALL customers' spreadsheets
    const customers = await Customer.find({ _id: { $in: ids } });
    const spreadsheetIds = [...new Set(customers.map(c => c.spreadsheet_id.toString()))];

    for (const spreadsheetId of spreadsheetIds) {
      const spreadsheet = await Spreadsheet.findById(spreadsheetId);
      if (!spreadsheet) continue;

      let hasWriteAccess = user.role === 'admin' ||
        spreadsheet.user_id.toString() === req.user.id ||
        (spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id));

      if (!hasWriteAccess) {
        const sharing = await Sharing.findOne({
          spreadsheet_id: spreadsheetId,
          shared_with_user_id: req.user.id
        });
        hasWriteAccess = sharing && sharing.permission_level === 'read-write';
      }

      if (!hasWriteAccess) {
        return res.status(403).json({ message: `Access denied for spreadsheet ${spreadsheet.name || spreadsheetId}` });
      }
    }

    const result = await Customer.updateMany(
      {
        _id: { $in: ids },
        business_id: user.business_id
      },
      {
        $set: { is_deleted: false, deleted_at: null }
      }
    );

    // Trigger background sync for affected spreadsheets
    spreadsheetIds.forEach(sid => syncToGoogleSheets(sid));

    res.json({
      message: `${result.modifiedCount} customers restored`,
      restoredCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// REORDER customers
router.post('/reorder', auth, async (req, res) => {
  try {
    const { customerIds } = req.body;

    if (!customerIds || !Array.isArray(customerIds)) {
      return res.status(400).json({ message: 'Invalid customer IDs format' });
    }

    // Check if user has write access to all these customers
    const customers = await Customer.find({ _id: { $in: customerIds } });

    // Group customers by spreadsheet_id
    const spreadsheetIds = [...new Set(customers.map(c => c.spreadsheet_id.toString()))];

    // Check access for each spreadsheet
    for (const spreadsheetId of spreadsheetIds) {
      const spreadsheet = await Spreadsheet.findById(spreadsheetId);
      if (!spreadsheet) {
        continue;
      }

      // Check role or assignment (Admin, Owner, or Assigned User)
      let hasWriteAccess = user.role === 'admin' ||
        spreadsheet.user_id.toString() === req.user.id ||
        (spreadsheet.assigned_users && spreadsheet.assigned_users.includes(req.user.id));

      if (!hasWriteAccess) {
        // Check if shared with this user with write permission
        const sharing = await Sharing.findOne({
          spreadsheet_id: spreadsheetId,
          shared_with_user_id: req.user.id
        });
        hasWriteAccess = sharing && sharing.permission_level === 'read-write';
      }

      if (!hasWriteAccess) {
        return res.status(403).json({ message: `You do not have write access to spreadsheet ${spreadsheet.name || spreadsheetId}` });
      }
    }

    // Update position for each customer
    const updates = customerIds.map((id, index) =>
      Customer.updateOne(
        { _id: id },
        { position: index }
      )
    );

    await Promise.all(updates);

    // Trigger background sync for affected spreadsheets
    spreadsheetIds.forEach(sid => syncToGoogleSheets(sid));

    res.json({ message: 'Order updated successfully' });
  } catch (err) {
    console.error('Reorder error:', err);
    res.status(500).json({ message: 'Error updating order', error: err.message });
  }
});

export default router;
