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
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';

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
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if the origin is in our allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Parse JSON bodies for all requests, including DELETE
app.use(express.json());

// Only apply fileUpload middleware to routes that need it
app.use('/api/customers', fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  useTempFiles: false,
  debug: false // Turn off debug to reduce logs
}));

// Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes); // Stricter limit for auth
app.use('/api/customers', apiLimiter, customerRoutes); // General API limit
app.use('/api/spreadsheets', apiLimiter, spreadsheetRoutes);
app.use('/api', apiLimiter, shareRoutes);

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

// Database Connection - Enhanced with connection pooling
const MONGO_URI = process.env.DATABASE_URL;

console.log('Attempting to connect to MongoDB...');
mongoose.connect(MONGO_URI, {
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections to maintain
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  family: 4 // Use IPv4, skip trying IPv6
})
  .then(() => console.log('Connected to MongoDB Atlas with connection pooling'))
  .catch((err) => {
    console.error('MongoDB Atlas connection error:', err);
  });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});