import express from 'express';
import Customer from '../models/Customer.js';
import Spreadsheet from '../models/Spreadsheet.js';
import Sharing from '../models/Sharing.js';
import auth from '../middleware/auth.js';
import XLSX from 'xlsx';
import fs from 'fs';

const router = express.Router();

// GET all customers for logged in user
router.get('/', auth, async (req, res) => {
  try {
    const { spreadsheetId } = req.query;
    
    if (!spreadsheetId) {
      return res.status(400).json({ message: 'spreadsheetId is required' });
    }
    
    // Validate that spreadsheetId is a valid ObjectId
    const mongoose = await import('mongoose');
    if (!mongoose.default.isValidObjectId(spreadsheetId)) {
      return res.status(400).json({ message: 'Invalid spreadsheet ID' });
    }
    
    // Check if user has access to this spreadsheet (owner or shared)
    const spreadsheet = await Spreadsheet.findOne({ _id: spreadsheetId });
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }
    
    // Check ownership or sharing
    let hasAccess = spreadsheet.user_id.toString() === req.user.id;
    
    if (!hasAccess) {
      // Check if shared with this user
      const sharing = await Sharing.findOne({ 
        spreadsheet_id: spreadsheetId, 
        shared_with_user_id: req.user.id 
      });
      hasAccess = !!sharing;
    }
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this spreadsheet' });
    }
    
    const customers = await Customer.find({ spreadsheet_id: spreadsheetId }).sort({ position: 1, next_call_date: 1, next_call_time: 1 });
    res.json(customers);
  } catch (err) {
    console.error('Error loading customers:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST new customer
router.post('/', auth, async (req, res) => {
  const { spreadsheet_id, customer_name, company_name, phone_number, next_call_date, next_call_time, last_call_date, remark, color } = req.body;
  
  if (!spreadsheet_id) {
    return res.status(400).json({ message: 'spreadsheet_id is required' });
  }
  
  // Validate that spreadsheet_id is a valid ObjectId
  const mongoose = await import('mongoose');
  if (!mongoose.default.isValidObjectId(spreadsheet_id)) {
    return res.status(400).json({ message: 'Invalid spreadsheet ID' });
  }
  
  // Check if user has write access to this spreadsheet
  const spreadsheet = await Spreadsheet.findOne({ _id: spreadsheet_id });
  if (!spreadsheet) {
    return res.status(404).json({ message: 'Spreadsheet not found' });
  }
  
  // Check ownership or sharing with write permission
  let hasWriteAccess = spreadsheet.user_id.toString() === req.user.id;
  
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
    spreadsheet_id: spreadsheet_id,
    customer_name,
    company_name,
    phone_number,
    next_call_date,
    next_call_time,
    last_call_date: last_call_date || '',
    remark: remark || '',
    color: color || null,
    position: newPosition
  });

  try {
    const newCustomer = await customer.save();
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

    const { spreadsheetId } = req.body;
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

    // Check ownership or sharing with write permission
    let hasWriteAccess = spreadsheet.user_id.toString() === req.user.id;

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
    const maxPositionCustomer = await Customer.findOne({ 
      spreadsheet_id: spreadsheetId 
    }).sort({ position: -1 });
    let currentPosition = maxPositionCustomer ? maxPositionCustomer.position + 1 : 0;

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
        spreadsheet_id: spreadsheetId,
        customer_name: customerName.toString().trim(),
        company_name: companyName.toString().trim(),
        phone_number: phoneNumber.toString().trim(),
        next_call_date: nextCallDate,
        next_call_time: (row['next_call_time'] || row['nextcalltime'] || '').toString().trim(),
        last_call_date: (row['last_call_date'] || row['lastcalldate'] || '').toString().trim(),
        remark: (row['remark'] || '').toString().trim(),
        color: null, // Default to null for imported customers
        position: currentPosition++
      };

      customers.push(customerData);
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation errors', errors });
    }

    // Insert all customers
    const insertedCustomers = await Customer.insertMany(customers);
    
    res.status(201).json({ 
      message: `${insertedCustomers.length} customers imported successfully`, 
      count: insertedCustomers.length,
      customers: insertedCustomers 
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ message: 'Error importing customers', error: err.message });
  }
});

// DOWNLOAD Excel template
router.get('/download-template', auth, async (req, res) => {
  try {
    // Create template data with exact column names
    const templateData = [{
      'customer_name': 'John Doe',
      'company_name': 'ABC Company',
      'phone_number': '+1234567890',
      'last_call_date': '2023-12-20',
      'next_call_date': '2023-12-25',
      'next_call_time': '14:30',
      'remark': 'Important client',
      'color': ''
    }];

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

// UPDATE customer
router.put('/:id', auth, async (req, res) => {
  try {
    // First find the customer to get its spreadsheet_id
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // Check if user has write access to this spreadsheet
    const spreadsheet = await Spreadsheet.findById(customer.spreadsheet_id);
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }
    
    // Check ownership or sharing with write permission
    let hasWriteAccess = spreadsheet.user_id.toString() === req.user.id;
    
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
    
    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    );
    
    if (!updatedCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
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
    
    // Check if user has write access to this spreadsheet
    const spreadsheet = await Spreadsheet.findById(customer.spreadsheet_id);
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }
    
    // Check ownership or sharing with write permission
    let hasWriteAccess = spreadsheet.user_id.toString() === req.user.id;
    
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
    
    const deletedCustomer = await Customer.findOneAndDelete({ _id: req.params.id });
    if (!deletedCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// BULK DELETE customers (using POST instead of DELETE with data)
router.post('/bulk-delete', auth, async (req, res) => {
  try {
    console.log('Bulk delete request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID:', req.user.id);
    
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
      
      // Check ownership or sharing with write permission
      let hasWriteAccess = spreadsheet.user_id.toString() === req.user.id;
      
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
    
    // First, let's check if we can find the customers
    try {
      const customersToCheck = await Customer.find({ 
        _id: { $in: validIds }
      });
      console.log('Customers to delete (before deletion):', customersToCheck.length);
    } catch (checkErr) {
      console.error('Error checking customers before deletion:', checkErr);
    }
    
    const result = await Customer.deleteMany({ 
      _id: { $in: validIds }
    });
    
    console.log('Delete result:', result);
    
    res.json({ 
      message: `${result.deletedCount} customers deleted successfully`,
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    console.error('Bulk delete error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Error deleting customers', error: err.message });
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
      
      // Check ownership or sharing with write permission
      let hasWriteAccess = spreadsheet.user_id.toString() === req.user.id;
      
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
    res.json({ message: 'Order updated successfully' });
  } catch (err) {
    console.error('Reorder error:', err);
    res.status(500).json({ message: 'Error updating order', error: err.message });
  }
});

export default router;