import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './models/Customer.js';

dotenv.config();

const MONGO_URI = process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error('DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('Connecting to MongoDB...');

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB Atlas');
    
    try {
      // Find customers without spreadsheet_id
      const unassignedCustomers = await Customer.find({ spreadsheet_id: { $exists: false } });
      console.log(`Found ${unassignedCustomers.length} unassigned customers`);
      
      if (unassignedCustomers.length > 0) {
        // Delete unassigned customers
        const result = await Customer.deleteMany({ spreadsheet_id: { $exists: false } });
        console.log(`Deleted ${result.deletedCount} unassigned customers`);
      } else {
        console.log('No unassigned customers found');
      }
      
      // Also find customers with null spreadsheet_id
      const nullSpreadsheetCustomers = await Customer.find({ spreadsheet_id: null });
      console.log(`Found ${nullSpreadsheetCustomers.length} customers with null spreadsheet_id`);
      
      if (nullSpreadsheetCustomers.length > 0) {
        // Delete customers with null spreadsheet_id
        const result = await Customer.deleteMany({ spreadsheet_id: null });
        console.log(`Deleted ${result.deletedCount} customers with null spreadsheet_id`);
      }
      
      console.log('Cleanup completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during cleanup:', error);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('MongoDB Atlas connection error:', err);
    process.exit(1);
  });