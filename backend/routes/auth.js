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
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();

// Helper to get Google Client
const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not defined in .env');
  }
  return new OAuth2Client(clientId);
};

// @route   POST /api/auth/register
// @desc    Register a new business and admin user
// @access  Public
router.post('/register', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { businessName, adminName, email, password } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // 1. Create Business
    const newBusiness = new Business({
      name: businessName,
      admin_id: new mongoose.Types.ObjectId(), // Placeholder, will update after user creation
      settings: {}
    });
    await newBusiness.save({ session });

    // 2. Create Admin User
    // We use email as the username for unique constraint compatibility, but 'name' is the display name
    const newUser = new User({
      username: email,
      name: adminName,
      email,
      password: await bcrypt.hash(password, 10),
      business_id: newBusiness._id,
      role: 'admin',
      permissions: ['dashboard', 'poster', 'webhooks']
    });

    // Explicitly set plain_password for admin visibility if desired (based on previous request)
    newUser.plain_password = password;

    await newUser.save({ session });

    // 3. Update Business with real Admin ID
    newBusiness.admin_id = newUser._id;
    await newBusiness.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Generate Token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, business_id: newUser.business_id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.name, // Send display name as username for frontend compatibility
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions,
        business_id: newUser.business_id
      }
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, business_id: user.business_id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.name || user.username, // Fallback to username if name missing
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        business_id: user.business_id
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/google-login
// @desc    Authenticate with Google ID Token
// @access  Public
router.post('/google-login', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ message: 'Google credential is required' });
  }

  try {
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    if (!payload.email_verified) {
      return res.status(400).json({ message: 'Google email not verified' });
    }

    // Find the user by their Google email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: 'No account found with this Google email. Please register your business first.'
      });
    }

    // Verify user is attached to a business (multi-tenant requirement)
    if (!user.business_id) {
      return res.status(403).json({
        message: 'Account exists but is not associated with any business. Please contact support.'
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, business_id: user.business_id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.name || user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        business_id: user.business_id
      }
    });

  } catch (err) {
    console.error('[Google Login Error]:', err);
    res.status(500).json({ message: 'Google authentication failed. Please try again or use email/password.' });
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
  const { name, email } = req.body;

  // Basic validation
  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name;
    // We update email, and also sync username to email for consistency if desired, or just leave username alone.
    // Since we Login with Email now, username is legacy. But let's keep it unique by syncing to email if we want, OR just ignore it.
    // If we update email, we should check if new email is taken (handled by unique constraint error).
    user.email = email;
    // user.username = email; // Optional: Sync username to email to keep it unique and relevant? 
    // If we do sync, we might hit collision if we don't handle it carefully. Let's just update email and name.

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.name, // Return name as username for frontend compat
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        business_id: user.business_id
      }
    });
  } catch (err) {
    if (err.code === 11000) {
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

    const users = await User.find({ business_id: user.business_id }).select('-password +plain_password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Admin: Create user in business
router.post('/business/users', auth, async (req, res) => {
  const { name, email, password, permissions } = req.body;
  try {
    const adminUser = await User.findById(req.user.id);
    if (adminUser.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    // Check if email already used
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User with this email already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username: email, // Use email as unique identifier backend-side
      name: name,      // Display name
      email,
      password: hashedPassword,
      business_id: adminUser.business_id,
      role: 'user',
      permissions: permissions || [],
      plain_password: password // Store plain text for Admin visibility
    });

    await user.save();
    res.json({ message: 'User created successfully', user: { id: user.id, username: user.name, email, role: 'user', permissions: user.permissions } });
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
    user.plain_password = password; // Update plain text on reset
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
