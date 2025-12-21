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
      // Count all customers
      const totalCustomers = await Customer.countDocuments();
      console.log(`Total customers in database: ${totalCustomers}`);
      
      // Count customers with spreadsheet_id
      const assignedCustomers = await Customer.countDocuments({ spreadsheet_id: { $exists: true, $ne: null } });
      console.log(`Customers assigned to spreadsheets: ${assignedCustomers}`);
      
      // Count customers without spreadsheet_id
      const unassignedCustomers = await Customer.countDocuments({ $or: [
        { spreadsheet_id: { $exists: false } },
        { spreadsheet_id: null }
      ]});
      console.log(`Unassigned customers: ${unassignedCustomers}`);
      
      console.log('Analysis completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during analysis:', error);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('MongoDB Atlas connection error:', err);
    process.exit(1);
  });