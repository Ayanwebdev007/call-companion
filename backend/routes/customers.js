import express from 'express';
import Customer from '../models/Customer.js';
import auth from '../middleware/auth.js';
import XLSX from 'xlsx';
import fs from 'fs';

const router = express.Router();

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
      buffer = fs.readFileSync(file.tempFilePath);
    } else {
      return res.status(400).json({ message: 'Invalid file format' });
    }
    
    // Debug file info
    console.log('File info:', {
      name: file.name,
      size: file.size,
      mimetype: file.mimetype,
      encoding: file.encoding
    });
    
    // Try reading with different options
    let workbook;
    try {
      // Method 1: Standard read
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (e1) {
      console.log('Method 1 failed:', e1.message);
      try {
        // Method 2: Read with cellNF
        workbook = XLSX.read(buffer, { type: 'buffer', cellNF: true });
      } catch (e2) {
        console.log('Method 2 failed:', e2.message);
        try {
          // Method 3: Read with all options
          workbook = XLSX.read(buffer, { type: 'buffer', cellNF: true, cellDates: true, sheetStubs: true });
        } catch (e3) {
          console.log('Method 3 failed:', e3.message);
          return res.status(400).json({ message: 'Unable to read Excel file', error: e3.message });
        }
      }
    }
    
    // Debug workbook info
    console.log('Workbook info:', {
      sheetNames: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length
    });
    
    // Check if workbook has sheets
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ message: 'No sheets found in Excel file' });
    }
    
    const sheetName = workbook.SheetNames[0];
    console.log('Using sheet:', sheetName);
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Try different parsing methods
    let data = [];
    
    // Method 1: Standard parsing
    try {
      data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      console.log('Method 1 - Standard parsing result:', data.length, 'rows');
    } catch (e1) {
      console.log('Method 1 failed:', e1.message);
      
      // Method 2: Parse with headers
      try {
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        console.log('Method 2 - Header parsing result:', data.length, 'rows');
        
        // If we got array of arrays, convert to objects
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          data = data.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || "";
            });
            return obj;
          });
          console.log('Converted to objects:', data.length, 'rows');
        }
      } catch (e2) {
        console.log('Method 2 failed:', e2.message);
        
        // Method 3: Parse with raw
        try {
          data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
          console.log('Method 3 - Raw parsing result:', data.length, 'rows');
        } catch (e3) {
          console.log('Method 3 failed:', e3.message);
          return res.status(400).json({ message: 'Unable to parse Excel file', error: e3.message });
        }
      }
    }
    
    // Debug: Log the raw data structure
    console.log('Excel data structure:', JSON.stringify(data.slice(0, 5), null, 2)); // Only first 5 rows

    if (!data || data.length === 0) {
      // Try to get raw cell data as fallback
      try {
        const rawCells = XLSX.utils.sheet_to_json(worksheet, { header: "A" });
        console.log('Raw cell data:', JSON.stringify(rawCells.slice(0, 5), null, 2));
        if (rawCells.length > 0) {
          data = rawCells;
        }
      } catch (rawErr) {
        console.log('Raw cell data extraction failed:', rawErr.message);
      }
      
      if (!data || data.length === 0) {
        return res.status(400).json({ 
          message: 'No data found in Excel file',
          file_info: {
            name: file.name,
            size: file.size,
            mimetype: file.mimetype
          }
        });
      }
    }

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

    // Process in batches to avoid memory issues
    const batchSize = 100;
    let validRowsProcessed = 0;

    for (let i = 0; i < data.length; i++) {
      const originalRow = data[i];
      const row = normalizeRow(originalRow);
      
      // Debug first few rows
      if (i < 3) {
        console.log(`Row ${i + 1}:`, JSON.stringify(row, null, 2));
      }
      
      // Try multiple possible column names
      const customerName = row['customer_name'] || row['customername'] || row['name'] || '';
      const companyName = row['company_name'] || row['companyname'] || row['company'] || '';
      const phoneNumber = row['phone_number'] || row['phonenumber'] || row['phone'] || '';
      
      // Validate mandatory fields
      if (!customerName || !companyName || !phoneNumber) {
        errors.push(`Row ${i + 1}: Missing mandatory fields. Found - Name: '${customerName}', Company: '${companyName}', Phone: '${phoneNumber}'`);
        if (i < 5) { // Only log first 5 errors
          console.log(`Row ${i + 1} debug:`, JSON.stringify(row, null, 2));
        }
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
      validRowsProcessed++;
    }

    console.log(`Processed ${validRowsProcessed} valid rows out of ${data.length} total rows`);

    if (customers.length === 0) {
      return res.status(400).json({ 
        message: 'No valid customers found in Excel file', 
        total_rows: data.length,
        sample_data: data.slice(0, 3), // Show first 3 rows for debugging
        errors: errors.slice(0, 10) // First 10 errors only
      });
    }

    // Process in batches to avoid memory issues
    let totalInserted = 0;
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      try {
        const insertedCustomers = await Customer.insertMany(batch);
        totalInserted += insertedCustomers.length;
        console.log(`Inserted batch of ${insertedCustomers.length} customers (${totalInserted}/${customers.length} total)`);
      } catch (batchErr) {
        console.error('Batch insert error:', batchErr);
        errors.push(`Batch insert error (rows ${i + 1}-${Math.min(i + batchSize, customers.length)}): ${batchErr.message}`);
      }
    }

    if (errors.length > 0 && totalInserted === 0) {
      return res.status(400).json({ 
        message: 'Errors occurred during import', 
        errors,
        processed: totalInserted,
        total_rows: data.length
      });
    }

    res.status(201).json({ 
      message: `${totalInserted} customers imported successfully`, 
      count: totalInserted,
      errors: errors.length > 0 ? errors : undefined
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

export default router;