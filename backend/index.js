import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import path from 'path';
import customerRoutes from './routes/customers.js';
import authRoutes from './routes/auth.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Increase payload limits and timeout
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Increase file upload limits and timeout
app.use('/api/customers', fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  useTempFiles: true, // Use temporary files for large uploads
  tempFileDir: '/tmp/',
  debug: false,
  abortOnLimit: true,
  responseOnLimit: 'File size limit exceeded',
  safeFileNames: true,
  preserveExtension: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    port: PORT
  });
});

// Root endpoint for debugging (optional)
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Call Companion Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      customers: '/api/customers',
      health: '/api/health'
    }
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

// Increase server timeout
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});