import express from 'express';
import Spreadsheet from '../models/Spreadsheet.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import auth from '../middleware/auth.js';
import checkPermission from '../middleware/permissions.js';

const router = express.Router();

// GET all spreadsheets for logged in user
router.get('/', auth, checkPermission('dashboard'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let query = { business_id: user.business_id };

    // If not admin, only show assigned spreadsheets
    if (user.role !== 'admin') {
      query.assigned_users = req.user.id;
    }

    // Get spreadsheets
    const spreadsheets = await Spreadsheet.find(query)
      .sort({ created_at: -1 })
      .populate('user_id', 'username');

    res.json(spreadsheets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new spreadsheet
router.post('/', auth, checkPermission('dashboard'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // AUTO-ASSIGN: Get all users in the business
    const businessUsers = await User.find({ business_id: user.business_id });
    const userIds = businessUsers.map(u => u._id);

    const spreadsheet = new Spreadsheet({
      user_id: req.user.id,
      business_id: user.business_id,
      name: req.body.name,
      description: req.body.description || '',
      assigned_users: userIds,
      is_unified: req.body.is_unified || false,
      linked_meta_sheets: req.body.linked_meta_sheets || []
    });

    const newSpreadsheet = await spreadsheet.save();
    res.status(201).json(newSpreadsheet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET specific spreadsheet
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    // First check if user is in the business and has access
    let query = { _id: req.params.id, business_id: user.business_id };
    if (user.role !== 'admin') {
      query.assigned_users = req.user.id;
    }

    let spreadsheet = await Spreadsheet.findOne(query);

    if (!spreadsheet) {
      // Check if it's shared with the user
      const Sharing = (await import('../models/Sharing.js')).default;
      const sharing = await Sharing.findOne({ spreadsheet_id: req.params.id, shared_with_user_id: req.user.id });
      if (sharing) {
        spreadsheet = await Spreadsheet.findById(req.params.id);
        if (spreadsheet) {
          const spreadObject = spreadsheet.toObject();
          spreadObject.permission_level = sharing.permission_level;
          spreadObject.is_shared = true;
          return res.json(spreadObject);
        }
      }
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    // If owner or admin, it's read-write
    const spreadObject = spreadsheet.toObject();
    spreadObject.permission_level = 'read-write';
    res.json(spreadObject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE spreadsheet
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find the spreadsheet and ensure it belongs to the same business
    const query = { _id: req.params.id, business_id: user.business_id };

    // Non-admins can only update their own spreadsheets
    if (user.role !== 'admin') {
      query.user_id = req.user.id;
    }

    const updatedSpreadsheet = await Spreadsheet.findOneAndUpdate(
      query,
      { ...req.body, updated_at: Date.now() },
      { new: true }
    );

    if (!updatedSpreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found or access denied' });
    }
    res.json(updatedSpreadsheet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE spreadsheet and all associated customers
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') return res.status(403).json({ message: 'Only admins can delete spreadsheets' });

    const spreadsheet = await Spreadsheet.findOne({ _id: req.params.id, business_id: user.business_id });
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

// LINK/UNLINK Meta Sheets to Unified Sheet
router.post('/:id/link', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { metaSheetIds, action } = req.body; // action: 'add' | 'remove' | 'set'

    const spreadsheet = await Spreadsheet.findOne({
      _id: req.params.id,
      business_id: user.business_id,
      is_unified: true
    });

    if (!spreadsheet) {
      return res.status(404).json({ message: 'Unified Spreadsheet not found' });
    }

    // Check permissions
    if (user.role !== 'admin' && spreadsheet.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    let currentLinks = spreadsheet.linked_meta_sheets.map(id => id.toString());
    const newIds = metaSheetIds.map(id => id.toString());

    if (action === 'add') {
      const unique = new Set([...currentLinks, ...newIds]);
      spreadsheet.linked_meta_sheets = Array.from(unique);
    } else if (action === 'remove') {
      spreadsheet.linked_meta_sheets = currentLinks.filter(id => !newIds.includes(id));
    } else if (action === 'set') {
      spreadsheet.linked_meta_sheets = newIds;
    }

    await spreadsheet.save();

    // Population for response
    await spreadsheet.populate('linked_meta_sheets', 'name is_meta');

    res.json(spreadsheet);

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
    const user = await User.findById(req.user.id);
    const newSpreadsheet = new Spreadsheet({
      user_id: req.user.id,
      business_id: user.business_id,
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
    const customers = await Customer.find({
      spreadsheet_id: { $in: spreadsheetIds },
      business_id: user.business_id // Strict isolation
    }).lean();

    const newCustomers = customers.map(c => {
      const { _id, ...rest } = c; // Remove _id
      return {
        ...rest,
        user_id: req.user.id,
        business_id: user.business_id, // Ensure business_id is preserved/set
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

// POST mark spreadsheet as viewed (deprecated - kept for compatibility)
router.post('/:id/view', auth, async (req, res) => {
  try {
    // No-op for now - view tracking removed
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST assign users to spreadsheet (Admin only)
router.put('/:id/assign', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign users to forms' });
    }

    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ message: 'userIds must be an array' });
    }

    // Update the spreadsheet with assigned users
    const spreadsheet = await Spreadsheet.findOneAndUpdate(
      { _id: req.params.id, business_id: user.business_id },
      { assigned_users: userIds },
      { new: true }
    );

    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    res.json({ message: 'Users assigned successfully', spreadsheet });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;