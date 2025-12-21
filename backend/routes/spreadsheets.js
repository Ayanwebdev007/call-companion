import express from 'express';
import Spreadsheet from '../models/Spreadsheet.js';
import Customer from '../models/Customer.js';
import Sharing from '../models/Sharing.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET all spreadsheets for logged in user (owned and shared)
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching spreadsheets for user:', req.user.id);
    // Get owned spreadsheets
    const ownedSpreadsheets = await Spreadsheet.find({ user_id: req.user.id }).sort({ created_at: -1 });
    console.log('Owned spreadsheets:', ownedSpreadsheets.length);
    
    // Get shared spreadsheets
    const sharedRecords = await Sharing.find({ shared_with_user_id: req.user.id })
      .populate('spreadsheet_id')
      .populate('owner_user_id', 'username')
      .catch(err => {
        console.error('Population error:', err);
        throw err;
      });
    
    console.log('Shared records found:', sharedRecords.length);
    
    // Debug logging for shared records
    console.log('Shared records before processing:', sharedRecords.map(record => ({
      spreadsheet_id: record.spreadsheet_id ? record.spreadsheet_id._id : 'null',
      spreadsheet_obj: record.spreadsheet_id ? record.spreadsheet_id.toObject() : 'null'
    })));
    
    const sharedSpreadsheets = sharedRecords
      .filter(record => record.spreadsheet_id && record.owner_user_id && record.spreadsheet_id._id) // Filter out records with null references
      .map(record => {
        const spreadsheetObj = record.spreadsheet_id.toObject();
        console.log('Spreadsheet object:', spreadsheetObj);
        return {
          ...spreadsheetObj,
          id: spreadsheetObj.id || record.spreadsheet_id._id.toString(), // Ensure we have an ID
          permission_level: record.permission_level,
          owner: record.owner_user_id.username,
          is_shared: true
        };
      });
    
    // Debug logging
    console.log('Owned spreadsheets:', ownedSpreadsheets.map(s => ({id: s.id, name: s.name})));
    console.log('Shared spreadsheets:', sharedSpreadsheets.map(s => ({id: s.id, name: s.name})));
    
    // Combine owned and shared spreadsheets
    const allSpreadsheets = [...ownedSpreadsheets, ...sharedSpreadsheets];
    
    // Remove duplicates by ID
    const uniqueSpreadsheets = allSpreadsheets.filter((spreadsheet, index, self) => 
      index === self.findIndex(s => s.id === spreadsheet.id)
    );
    
    // Sort by created_at descending
    uniqueSpreadsheets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    console.log('Final spreadsheets count:', uniqueSpreadsheets.length);
    res.json(uniqueSpreadsheets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new spreadsheet
router.post('/', auth, async (req, res) => {
  const spreadsheet = new Spreadsheet({
    user_id: req.user.id,
    name: req.body.name,
    description: req.body.description || ''
  });

  try {
    const newSpreadsheet = await spreadsheet.save();
    res.status(201).json(newSpreadsheet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET specific spreadsheet
router.get('/:id', auth, async (req, res) => {
  try {
    // First check if user owns the spreadsheet
    let spreadsheet = await Spreadsheet.findOne({ _id: req.params.id, user_id: req.user.id });
    
    // If not owned, check if it's shared with the user
    if (!spreadsheet) {
      const sharedRecord = await Sharing.findOne({
        spreadsheet_id: req.params.id,
        shared_with_user_id: req.user.id
      }).populate('spreadsheet_id');
      
      if (sharedRecord) {
        spreadsheet = sharedRecord.spreadsheet_id;
      }
    }
    
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }
    
    res.json(spreadsheet);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE spreadsheet
router.put('/:id', auth, async (req, res) => {
  try {
    const updatedSpreadsheet = await Spreadsheet.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { ...req.body, updated_at: Date.now() },
      { new: true }
    );
    if (!updatedSpreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }
    res.json(updatedSpreadsheet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE spreadsheet and all associated customers
router.delete('/:id', auth, async (req, res) => {
  try {
    const spreadsheet = await Spreadsheet.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    // Delete all customers associated with this spreadsheet
    await Customer.deleteMany({ spreadsheet_id: req.params.id });

    // Delete the spreadsheet
    await Spreadsheet.deleteOne({ _id: req.params.id });

    res.json({ message: 'Spreadsheet and associated customers deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;