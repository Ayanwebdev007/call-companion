import express from 'express';
import Sharing from '../models/Sharing.js';
import Spreadsheet from '../models/Spreadsheet.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// POST /api/spreadsheets/:id/share - Share spreadsheet with user by username
router.post('/spreadsheets/:id/share', auth, async (req, res) => {
  try {
    const { username, permission_level } = req.body;
    const spreadsheetId = req.params.id;
    
    // Validate that spreadsheetId is a valid ObjectId
    const mongoose = await import('mongoose');
    if (!mongoose.default.isValidObjectId(spreadsheetId)) {
      return res.status(400).json({ message: 'Invalid spreadsheet ID' });
    }

    // Check if spreadsheet exists and user is the owner
    const spreadsheet = await Spreadsheet.findOne({ 
      _id: spreadsheetId, 
      user_id: req.user.id 
    });

    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found or you do not have permission to share it' });
    }

    // Find the user to share with
    const userToShareWith = await User.findOne({ username });
    if (!userToShareWith) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if trying to share with themselves
    if (userToShareWith.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot share a spreadsheet with yourself' });
    }

    // Create or update sharing record
    const sharing = await Sharing.findOneAndUpdate(
      { 
        spreadsheet_id: spreadsheetId, 
        shared_with_user_id: userToShareWith.id 
      },
      {
        spreadsheet_id: spreadsheetId,
        owner_user_id: req.user.id,
        shared_with_user_id: userToShareWith.id,
        permission_level: permission_level || 'read-only'
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ 
      message: 'Spreadsheet shared successfully', 
      sharing 
    });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/shared-spreadsheets - Get spreadsheets shared with current user
router.get('/shared-spreadsheets', auth, async (req, res) => {
  try {
    console.log('Fetching shared spreadsheets for user:', req.user.id);
    const sharedRecords = await Sharing.find({ shared_with_user_id: req.user.id })
      .populate('spreadsheet_id')
      .populate('owner_user_id', 'username')
      .catch(err => {
        console.error('Population error:', err);
        throw err;
      });
    
    console.log('Shared records found:', sharedRecords.length);
    console.log('Shared records:', JSON.stringify(sharedRecords, null, 2));

    const sharedSpreadsheets = sharedRecords
      .filter(record => record.spreadsheet_id && record.owner_user_id) // Filter out records with null references
      .map(record => ({
        ...record.spreadsheet_id.toObject(),
        permission_level: record.permission_level,
        owner: record.owner_user_id.username,
        is_shared: true
      }));

    res.json(sharedSpreadsheets);
  } catch (err) {
    console.error('Get shared spreadsheets error:', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/spreadsheets/:id/share/:username - Remove sharing access
router.delete('/spreadsheets/:id/share/:username', auth, async (req, res) => {
  try {
    const spreadsheetId = req.params.id;
    const username = req.params.username;
    
    // Validate that spreadsheetId is a valid ObjectId
    const mongoose = await import('mongoose');
    if (!mongoose.default.isValidObjectId(spreadsheetId)) {
      return res.status(400).json({ message: 'Invalid spreadsheet ID' });
    }

    // Find the user
    const userToRemove = await User.findOne({ username });
    if (!userToRemove) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if spreadsheet exists and user is the owner
    const spreadsheet = await Spreadsheet.findOne({ 
      _id: spreadsheetId, 
      user_id: req.user.id 
    });

    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found or you do not have permission to modify sharing' });
    }

    // Remove sharing record
    const result = await Sharing.deleteOne({ 
      spreadsheet_id: spreadsheetId, 
      shared_with_user_id: userToRemove.id 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Sharing record not found' });
    }

    res.json({ message: 'Sharing access removed successfully' });
  } catch (err) {
    console.error('Remove sharing error:', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/spreadsheets/:id/share/:username - Update permission level
router.put('/spreadsheets/:id/share/:username', auth, async (req, res) => {
  try {
    const { permission_level } = req.body;
    const spreadsheetId = req.params.id;
    const username = req.params.username;
    
    // Validate that spreadsheetId is a valid ObjectId
    const mongoose = await import('mongoose');
    if (!mongoose.default.isValidObjectId(spreadsheetId)) {
      return res.status(400).json({ message: 'Invalid spreadsheet ID' });
    }

    // Validate permission level
    if (!['read-only', 'read-write'].includes(permission_level)) {
      return res.status(400).json({ message: 'Invalid permission level' });
    }

    // Find the user
    const userToUpdate = await User.findOne({ username });
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if spreadsheet exists and user is the owner
    const spreadsheet = await Spreadsheet.findOne({ 
      _id: spreadsheetId, 
      user_id: req.user.id 
    });

    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found or you do not have permission to modify sharing' });
    }

    // Update sharing record
    const sharing = await Sharing.findOneAndUpdate(
      { 
        spreadsheet_id: spreadsheetId, 
        shared_with_user_id: userToUpdate.id 
      },
      { permission_level },
      { new: true }
    );

    if (!sharing) {
      return res.status(404).json({ message: 'Sharing record not found' });
    }

    res.json({ 
      message: 'Permission level updated successfully', 
      sharing 
    });
  } catch (err) {
    console.error('Update permission error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/spreadsheets/:id/shared-users - Get users shared with a specific spreadsheet
router.get('/spreadsheets/:id/shared-users', auth, async (req, res) => {
  try {
    const spreadsheetId = req.params.id;
    
    // Validate that spreadsheetId is a valid ObjectId
    const mongoose = await import('mongoose');
    if (!mongoose.default.isValidObjectId(spreadsheetId)) {
      return res.status(400).json({ message: 'Invalid spreadsheet ID' });
    }

    // First check if the spreadsheet exists
    const spreadsheetExists = await Spreadsheet.findById(spreadsheetId);
    if (!spreadsheetExists) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }
    
    // Check if user is the owner or has access
    let hasAccess = spreadsheetExists.user_id.toString() === req.user.id;
    
    if (!hasAccess) {
      // Check if shared with this user
      const sharingRecord = await Sharing.findOne({ 
        spreadsheet_id: spreadsheetId, 
        shared_with_user_id: req.user.id 
      });
      hasAccess = !!sharingRecord;
    }
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this spreadsheet' });
    }
    
    const spreadsheet = spreadsheetExists;

    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found or you do not have access to it' });
    }

    // Get sharing records for this spreadsheet
    const sharedRecords = await Sharing.find({ spreadsheet_id: spreadsheetId })
      .populate('shared_with_user_id', 'username');

    const sharedUsers = sharedRecords.map(record => ({
      username: record.shared_with_user_id.username,
      permission_level: record.permission_level,
      created_at: record.created_at
    }));

    res.json(sharedUsers);
  } catch (err) {
    console.error('Get shared users error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;