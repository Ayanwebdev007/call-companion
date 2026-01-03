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

// SURGICAL WEBHOOK LOGGER - CATCHES SIGNAL BEFORE ANY ROUTING
app.use((req, res, next) => {
  if (req.originalUrl.includes('meta/webhook')) {
    console.log(`[WEBHOOK PROBE] ${req.method} ${req.originalUrl}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
  }
  next();
});


// Debug logging
console.log('Starting server...');
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
app.get('/api/meta/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('--- META WEBHOOK VERIFIED ---');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Verification failed');
});

app.post('/api/meta/webhook', (req, res, next) => {
  console.log('--- META WEBHOOK LEAD RECEIVED (POST) ---');
  console.log('Body:', JSON.stringify(req.body, null, 2));

  // Respond 200 immediately to Meta
  res.status(200).send('EVENT_RECEIVED');

  // Forward for background processing
  next();
});

// Other Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/spreadsheets', spreadsheetRoutes);
app.use('/api', shareRoutes);
app.use('/api', posterRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/googlesheets', googleSheetsRoutes);
app.use('/api/meta', metaRoutes); // Keep for the POST handler

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