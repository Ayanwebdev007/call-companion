import express from 'express';
import Spreadsheet from '../models/Spreadsheet.js';
import Customer from '../models/Customer.js';
import Sharing from '../models/Sharing.js';
import auth from '../middleware/auth.js';
import ViewLog from '../models/ViewLog.js';

const router = express.Router();

// GET all spreadsheets for logged in user (owned and shared)
router.get('/', auth, async (req, res) => {
  try {
    // Get owned spreadsheets
    const ownedSpreadsheets = await Spreadsheet.find({ user_id: req.user.id }).sort({ created_at: -1 });

    // Get shared spreadsheets
    const sharedRecords = await Sharing.find({ shared_with_user_id: req.user.id })
      .populate('spreadsheet_id')
      .populate('owner_user_id', 'username');

    const sharedSpreadsheets = sharedRecords
      .filter(record => record.spreadsheet_id && record.owner_user_id) // Filter out records with null references
      .map(record => {
        const spreadsheetObj = record.spreadsheet_id.toObject();
        return {
          ...spreadsheetObj,
          id: spreadsheetObj.id || record.spreadsheet_id._id.toString(), // Ensure we have an ID
          permission_level: record.permission_level,
          owner: record.owner_user_id.username,
          is_shared: true
        };
      });

    // Combine owned and shared spreadsheets
    const allSpreadsheets = [...ownedSpreadsheets, ...sharedSpreadsheets];

    // Remove duplicates by ID
    const uniqueSpreadsheets = allSpreadsheets.filter((spreadsheet, index, self) =>
      index === self.findIndex(s => s.id === spreadsheet.id)
    );

    // Sort by created_at descending
    uniqueSpreadsheets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Calculate new leads count for each unique spreadsheet
    const spreadsheetsWithCounts = await Promise.all(uniqueSpreadsheets.map(async (s) => {
      const spreadsheetId = s.id || s._id;

      // Get last view log for this user and spreadsheet
      const log = await ViewLog.findOne({ user_id: req.user.id, spreadsheet_id: spreadsheetId });

      const query = {
        spreadsheet_id: spreadsheetId,
        user_id: s.user_id // Filter by owner of spreadsheet to be safe, though id is usually enough
      };

      if (log) {
        query.created_at = { $gt: log.last_viewed_at };
      }

      const newLeadsCount = await Customer.countDocuments(query);

      return {
        ...s.toObject ? s.toObject() : s,
        id: spreadsheetId,
        newLeadsCount
      };
    }));

    res.json(spreadsheetsWithCounts);
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

// MERGE spreadsheets
router.post('/merge', auth, async (req, res) => {
  const { spreadsheetIds, name } = req.body;

  if (!spreadsheetIds || !Array.isArray(spreadsheetIds) || spreadsheetIds.length < 2) {
    return res.status(400).json({ message: 'At least two spreadsheets are required for merging.' });
  }

  try {
    // 1. Verify ownership and existence of all spreadsheets
    const spreadsheets = await Spreadsheet.find({
      _id: { $in: spreadsheetIds },
      user_id: req.user.id
    });

    if (spreadsheets.length !== spreadsheetIds.length) {
      return res.status(400).json({ message: 'One or more spreadsheets not found or permission denied.' });
    }

    // 2. Validate consistency (Optional: Check if they are all Meta and share same page/form)
    // For now, we trust the frontend grouping, but basic check is good.
    const firstSheet = spreadsheets[0];
    const isConsistent = spreadsheets.every(s =>
      s.is_meta === firstSheet.is_meta &&
      s.page_name === firstSheet.page_name &&
      s.form_name === firstSheet.form_name
    );

    if (!isConsistent) {
      // We can allow merging inconsistent sheets if user wants, but per requirements: "merge only for same form"
      return res.status(400).json({ message: 'Spreadsheets must share the same Page, Form, and Meta status to be merged.' });
    }

    // 3. Create new Merged Spreadsheet
    const newSpreadsheet = new Spreadsheet({
      user_id: req.user.id,
      name: name || `Merged: ${firstSheet.page_name} - ${firstSheet.form_name}`,
      description: `Merged from ${spreadsheets.length} spreadsheets. Source Page: ${firstSheet.page_name}, Form: ${firstSheet.form_name}`,
      is_meta: firstSheet.is_meta,
      meta_headers: firstSheet.meta_headers, // Assume headers are compatible if form is same
      page_name: firstSheet.page_name,
      form_name: firstSheet.form_name,
      campaign_name: 'Merged Campaign',
      ad_set_name: 'Merged Ad Set',
      ad_name: 'Merged Ad'
    });

    await newSpreadsheet.save();

    // 4. Fetch and Copy Customers
    // We want to copy everything. Duplicate check? User said "merge data", usually implies union.
    // We'll simplisticly copy all.
    const customers = await Customer.find({ spreadsheet_id: { $in: spreadsheetIds } }).lean();

    const newCustomers = customers.map(c => {
      const { _id, ...rest } = c; // Remove _id
      return {
        ...rest,
        user_id: req.user.id, // Ensure user_id is set
        spreadsheet_id: newSpreadsheet._id,
        created_at: new Date(),
        updated_at: new Date()
      };
    });

    if (newCustomers.length > 0) {
      // Chunk insert if too large? For now insertMany is fine for reasonable sizes
      await Customer.insertMany(newCustomers);
    }

    res.status(201).json(newSpreadsheet);

  } catch (err) {
    console.error('Merge error:', err);
    res.status(500).json({ message: 'Failed to merge spreadsheets. ' + err.message });
  }
});

// POST mark spreadsheet as viewed
router.post('/:id/view', auth, async (req, res) => {
  try {
    await ViewLog.findOneAndUpdate(
      { user_id: req.user.id, spreadsheet_id: req.params.id },
      { last_viewed_at: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;