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

// More flexible CORS for production
const allowedOrigins = [
  'http://localhost:8080', 
  'http://localhost:8081', 
  'http://192.168.31.210:8081',
  'https://your-render-frontend.onrender.com'
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

app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  useTempFiles: false,
  debug: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);

// Database Connection - Updated for MongoDB Atlas
const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/call-companion';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB Atlas connection error:', err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});