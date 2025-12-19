const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');
const XLSX = require('xlsx');

// GET all customers for logged in user
router.get('/', auth, async (req, res) => {
  try {
    const customers = await Customer.find({ user_id: req.user.id }).sort({ next_call_date: 1, next_call_time: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new customer
router.post('/', auth, async (req, res) => {
  const customer = new Customer({
    user_id: req.user.id,
    customer_name: req.body.customer_name,
    company_name: req.body.company_name,
    phone_number: req.body.phone_number,
    next_call_date: req.body.next_call_date,
    next_call_time: req.body.next_call_time,
    remark: req.body.remark
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

    const file = req.files.file;
    let buffer;
    
    // Handle both buffer and temp file approaches
    if (file.data) {
      // Direct buffer approach
      buffer = Buffer.from(file.data);
    } else if (file.tempFilePath) {
      // Temp file approach
      const fs = require('fs');
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
        customer_name: customerName.toString().trim(),
        company_name: companyName.toString().trim(),
        phone_number: phoneNumber.toString().trim(),
        next_call_date: nextCallDate,
        next_call_time: (row['next_call_time'] || row['nextcalltime'] || '').toString().trim(),
        remark: (row['remark'] || '').toString().trim()
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
      'next_call_date': '2023-12-25',
      'next_call_time': '14:30',
      'remark': 'Important client'
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
    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
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
    const deletedCustomer = await Customer.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    if (!deletedCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
