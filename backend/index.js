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

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

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
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/spreadsheets', spreadsheetRoutes);
app.use('/api', shareRoutes);
app.use('/api', posterRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/googlesheets', googleSheetsRoutes);

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