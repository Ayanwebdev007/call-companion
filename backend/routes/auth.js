import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Business from '../models/Business.js';
import auth from '../middleware/auth.js';
import checkPermission from '../middleware/permissions.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    let user = await User.findOne({ $or: [{ username }, { email }] });
    if (user) {
      return res.status(400).json({ message: 'User or email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      email,
      password: hashedPassword,
      role: 'admin',
      permissions: ['dashboard', 'poster', 'webhooks']
    });

    await user.save();

    // Create Business for the new admin
    const business = new Business({
      name: `${username}'s Business`,
      admin_id: user.id
    });

    await business.save();

    user.business_id = business.id;
    await user.save();

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      business_id: user.business_id
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret_key_change_me',
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: payload });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      business_id: user.business_id
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret_key_change_me',
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: payload });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log('Received forgot-password request for:', email);
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();
    console.log('Reset token generated and saved for:', email);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // For development fallback to log if no credentials
    if (!process.env.RESEND_API_KEY) {
      console.log('RESET LINK (Dev Mode):', `${frontendUrl}/reset-password/${token}`);
      return res.json({ message: 'Reset link generated (check server logs for development)', devMode: true });
    }

    console.log('--- ATTEMPTING EMAIL SEND (Resend) ---');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: process.env.SENDER_EMAIL || 'Call Companion <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Password Reset',
      html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>` +
        `<p>Please click on the following link, or paste this into your browser to complete the process:</p>` +
        `<p><a href="${frontendUrl}/reset-password/${token}">${frontendUrl}/reset-password/${token}</a></p>` +
        `<p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`
    });

    if (error) {
      console.error('Resend Error:', error);
      return res.status(500).json({ message: 'Email service failed: ' + error.message });
    }

    console.log('Email sent successfully via Resend:', data.id);
    res.json({ message: 'Email sent' });
  } catch (err) {
    console.error('Error in forgot-password:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    res.json({ message: 'Password has been reset' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Change password (authenticated - Admin Only as per new requirements)
router.post('/change-password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Only admins can change passwords manually.' });
    }

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);
    user.password = hashedPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update Profile
router.put('/update-profile', auth, async (req, res) => {
  const { username, email } = req.body;

  // Basic validation
  if (!username || !email) {
    return res.status(400).json({ message: 'Username and email are required' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.username = username;
    user.email = email;
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        business_id: user.business_id
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern.username) return res.status(400).json({ message: 'Username is already taken' });
      if (err.keyPattern.email) return res.status(400).json({ message: 'Email is already taken' });
    }
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get current user (with Business Settings & Auto-Migration)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();

    if (user.business_id) {
      const business = await Business.findById(user.business_id);

      if (business) {
        // MIGRATION CHECK: If Admin has legacy settings but Business is empty, migrate them.
        // We check for 'metaVerifyToken' or 'metaPages' existence in user settings.
        // Note: user.settings comes from lean(), assuming it exists in DB doc even if not in Schema.

        const userHasSettings = user.settings && (user.settings.metaVerifyToken || (user.settings.metaPages && user.settings.metaPages.length > 0));
        const businessHasSettings = business.settings && (business.settings.metaVerifyToken || (business.settings.metaPages && business.settings.metaPages.length > 0));

        if (user.role === 'admin' && userHasSettings && !businessHasSettings) {
          console.log(`[AUTH] Migrating legacy settings from Admin (${user.username}) to Business (${business.name})...`);

          // Merge legacy user settings into business settings
          business.settings = {
            ...business.settings, // Keep defaults/structure
            ...user.settings      // Overwrite with legacy data
          };

          await business.save();
          console.log('[AUTH] Migration complete.');
        }

        // Always serve the Business settings strictly
        if (business.settings) {
          user.settings = business.settings;
        }
      }
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update business settings (Controlled by Admin)
router.put('/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update business settings' });
    }

    const business = await Business.findById(user.business_id);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    business.settings = {
      ...business.settings,
      ...settings
    };

    await business.save();
    res.json({ message: 'Settings updated successfully', settings: business.settings });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Admin: Get all users in business
router.get('/business/users', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    const users = await User.find({ business_id: user.business_id }).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Admin: Create user in business
router.post('/business/users', auth, async (req, res) => {
  const { username, email, password, permissions } = req.body;
  try {
    const adminUser = await User.findById(req.user.id);
    if (adminUser.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    let user = await User.findOne({ $or: [{ username }, { email }] });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      email,
      password: hashedPassword,
      business_id: adminUser.business_id,
      role: 'user',
      permissions: permissions || []
    });

    await user.save();
    res.json({ message: 'User created successfully', user: { id: user.id, username, email, role: 'user', permissions: user.permissions } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Admin: Update user permissions
router.put('/business/users/:id/permissions', auth, async (req, res) => {
  const { permissions } = req.body;
  try {
    const adminUser = await User.findById(req.user.id);
    if (adminUser.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    const user = await User.findOne({ _id: req.params.id, business_id: adminUser.business_id });
    if (!user) return res.status(404).json({ message: 'User not found in your business' });

    user.permissions = permissions;
    await user.save();
    res.json({ message: 'Permissions updated successfully', permissions: user.permissions });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Admin: Delete user
router.delete('/business/users/:id', auth, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (adminUser.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    const user = await User.findOne({ _id: req.params.id, business_id: adminUser.business_id });
    if (!user) return res.status(404).json({ message: 'User not found in your business' });

    await User.deleteOne({ _id: req.params.id });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Admin: Reset user password
router.post('/business/users/:id/reset-password', auth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'New password is required' });

  try {
    const adminUser = await User.findById(req.user.id);
    if (adminUser.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    const user = await User.findOne({ _id: req.params.id, business_id: adminUser.business_id });
    if (!user) return res.status(404).json({ message: 'User not found in your business' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    res.json({ message: 'User password reset successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get Business Details
router.get('/business', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const business = await Business.findById(user.business_id);
    if (!business) return res.status(404).json({ message: 'Business not found' });

    res.json(business);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;
