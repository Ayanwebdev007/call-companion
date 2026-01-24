import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import path from 'path';
import { createServer } from 'http';
import { initializeSocketIO } from './socket.js';
import customerRoutes from './routes/customers.js';
import authRoutes from './routes/auth.js';
import spreadsheetRoutes from './routes/spreadsheets.js';
import shareRoutes from './routes/shares.js';
import posterRoutes from './routes/poster.js';
import whatsappRoutes from './routes/whatsapp.js';
import googleSheetsRoutes from './routes/googlesheets.js';
import metaRoutes from './routes/meta.js';
import mobileRoutes from './routes/mobile.js'; // Mobile App Sync

// 1. CORE CONFIG & PARSING
dotenv.config();
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Parse JSON bodies early so logs can see them
app.use(express.json({ limit: "50mb" }));

// More flexible CORS for production
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
  'http://192.168.31.210:8081',
  'https://call-companion-frontend.onrender.com',
  process.env.FRONTEND_URL
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

// 2. GLOBAL REQUEST LOGGER (Minimal for production)
app.use((req, res, next) => {
  if (req.originalUrl.toLowerCase().includes('meta') || req.originalUrl.toLowerCase().includes('webhook')) {
    console.log(`[META-WEBHOOK] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Debug logging
console.log('=========================================');
console.log('SERVER STARTING - VERSION 3.3 (WebSocket)');
console.log('=========================================');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('PORT from env:', process.env.PORT || 'NOT SET (using default 5000)');
console.log('Final PORT value:', PORT);

// CORS already initialized at top

// Body parser already initialized at top

// Only apply fileUpload middleware to routes that need it
app.use('/api/customers', fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  useTempFiles: false,
  debug: false // Turn off debug to reduce logs
}));

// Routes
// Routes - PRIORITY ROUTES FIRST
app.use('/api/meta', metaRoutes); // Moved to top priority

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/spreadsheets', spreadsheetRoutes);
app.use('/api', shareRoutes);
app.use('/api', posterRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/googlesheets', googleSheetsRoutes);
app.use('/api/mobile', mobileRoutes);



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
  console.log('Body:', req.body);
  res.status(200).json({
    message: 'DEBUG_OK',
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers
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

// Initialize Socket.IO
initializeSocketIO(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});