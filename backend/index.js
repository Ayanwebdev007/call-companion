import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import path from 'path';
import customerRoutes from './routes/customers.js';
import authRoutes from './routes/auth.js';
import spreadsheetRoutes from './routes/spreadsheets.js';
import shareRoutes from './routes/shares.js';
import posterRoutes from './routes/poster.js';
import whatsappRoutes from './routes/whatsapp.js';
import googleSheetsRoutes from './routes/googlesheets.js';
import metaRoutes from './routes/meta.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// FUZZY WEBHOOK PROBE - CATCHES ANYTHING WITH 'meta' OR 'webhook'
app.use((req, res, next) => {
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  if (req.originalUrl.toLowerCase().includes('meta') || req.originalUrl.toLowerCase().includes('webhook')) {
    console.log(`[FUZZY PROBE] ${req.method} ${fullUrl}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
  }
  next();
});


// Debug logging
console.log('=========================================');
console.log('SERVER STARTING - VERSION 3.0 (META FIX)');
console.log('=========================================');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('PORT from env:', process.env.PORT || 'NOT SET (using default 5000)');
console.log('Final PORT value:', PORT);

// More flexible CORS for production
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
  'http://192.168.31.210:8081',
  'https://call-companion-frontend.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Parse JSON bodies for all requests, including DELETE
app.use(express.json({ limit: "50mb" }));

// Only apply fileUpload middleware to routes that need it
app.use('/api/customers', fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  useTempFiles: false,
  debug: false // Turn off debug to reduce logs
}));

// Routes
// Consolidated Meta Webhook (Directly in index.js to avoid routing issues)
app.get('/api/meta/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('--- META WEBHOOK VERIFICATION ATTEMPT ---');
  console.log('Mode:', mode);
  console.log('Token received:', token ? 'PRESENT' : 'MISSING');

  if (mode === 'subscribe') {
    // Try to find user with matching verify token
    const User = (await import('./models/User.js')).default;
    const user = await User.findOne({ 'settings.metaVerifyToken': token });

    if (user) {
      console.log(`--- META WEBHOOK VERIFIED (User: ${user.username}) ---`);
      return res.status(200).send(challenge);
    }

    // Fallback to environment variable for backward compatibility
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (token === verifyToken) {
      console.log('--- META WEBHOOK VERIFIED (Global Token) ---');
      return res.status(200).send(challenge);
    }

    console.warn('--- WEBHOOK VERIFICATION FAILED ---');
    return res.status(403).send('Verification failed');
  }

  res.status(400).send('Invalid mode');
});

app.post('/api/meta/webhook', async (req, res) => {
  console.log('!!! META WEBHOOK POST HIT !!!');
  console.log('Method:', req.method);
  console.log('URL:', req.originalUrl);
  console.log('Body:', JSON.stringify(req.body, null, 2));

  // Respond to Meta IMMEDIATELY to prevent timeout
  res.status(200).send('EVENT_RECEIVED');

  // Background Processing
  try {
    const metaService = (await import('./services/metaService.js')).default;
    const Customer = (await import('./models/Customer.js')).default;
    const User = (await import('./models/User.js')).default;
    const mongoose = (await import('mongoose')).default;

    const body = req.body;
    if (body.object === 'page') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const leadId = change.value.leadgen_id;
            const pageId = change.value.page_id;
            console.log(`[Background] Processing lead: ${leadId} for page: ${pageId}`);

            // Find user by page_id (exact match)
            const user = await User.findOne({
              'settings.metaPageId': pageId,
              'settings.metaPageAccessToken': { $exists: true, $ne: '' }
            });

            if (!user) {
              console.error(`[Background Error] No user found for page_id: ${pageId}`);
              console.error('Make sure a user has configured metaPageId matching this page_id');
              continue;
            }

            console.log(`[Background] Found user: ${user.username} for page: ${pageId}`);

            try {
              const leadDetails = await metaService.getLeadDetails(leadId, user.settings.metaPageAccessToken);

              let spreadsheet = await mongoose.model('Spreadsheet').findOne({ user_id: user._id, name: 'Meta Ads Leads' });
              if (!spreadsheet) {
                spreadsheet = new (mongoose.model('Spreadsheet'))({ user_id: user._id, name: 'Meta Ads Leads', description: 'Leads from Meta Ads' });
                await spreadsheet.save();
              }

              // Check for duplicate leads (by Meta Lead ID in remark or email/phone)
              const existingCustomer = await Customer.findOne({
                user_id: user._id,
                spreadsheet_id: spreadsheet._id,
                $or: [
                  { remark: { $regex: `Meta ID: ${leadId}`, $options: 'i' } },
                  { email: leadDetails.email || '' },
                  { phone_number: leadDetails.phoneNumber || 'N/A' }
                ]
              });

              if (existingCustomer) {
                console.log(`[Background] Lead ${leadId} already exists as customer ${existingCustomer._id}`);
                continue;
              }

              const customer = new Customer({
                user_id: user._id,
                spreadsheet_id: spreadsheet._id,
                customer_name: leadDetails.customerName || 'Meta Lead',
                company_name: leadDetails.companyName || 'Meta Ads',
                phone_number: leadDetails.phoneNumber || 'N/A',
                email: leadDetails.email || '',
                remark: `Meta Lead ID: ${leadId}`,
                status: 'new'
              });
              await customer.save();
              console.log(`[Background] Successfully saved customer: ${customer._id} for lead: ${leadId}`);
            } catch (leadError) {
              console.error(`[Background Error] Failed to process lead ${leadId}:`, leadError.message);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[Background Error] Meta Processing:', err.message);
  }
});

// Other Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/spreadsheets', spreadsheetRoutes);
app.use('/api', shareRoutes);
app.use('/api', posterRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/googlesheets', googleSheetsRoutes);
// app.use('/api/meta', metaRoutes); // Handled directly in index.js for maximum stability

// Test DELETE route
app.delete('/api/test-delete', (req, res) => {
  res.status(200).json({ message: 'DELETE route working' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    port: PORT
  });
});

// Specialized POST test endpoint
app.post('/api/test-post', (req, res) => {
  console.log('!!! MANUAL POST TEST RECEIVED !!!');
  res.status(200).json({ message: 'POST received successfully' });
});

// Meta Delivery Diagnosis Route (Accepts anything)
app.all('/api/meta-debug', (req, res) => {
  console.log('!!! META DEBUG ROUTE HIT !!!');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  res.status(200).send('DEBUG_OK');
});

// Database Connection - Updated for MongoDB Atlas
const MONGO_URI = process.env.DATABASE_URL;

console.log('Attempting to connect to MongoDB...');
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('MongoDB Atlas connection error:', err);
  });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});