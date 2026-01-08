import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Business from './models/Business.js';
import Spreadsheet from './models/Spreadsheet.js';
import Customer from './models/Customer.js';
import Company from './models/Company.js';
import Template from './models/Template.js';

dotenv.config();

const MONGO_URI = process.env.DATABASE_URL;

async function checkDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB\n');

        const users = await User.find({});
        const businesses = await Business.find({});
        const spreadsheets = await Spreadsheet.find({});
        const customers = await Customer.find({});
        const companies = await Company.find({});
        const templates = await Template.find({});

        console.log('=== DATABASE STATUS ===');
        console.log(`Users: ${users.length}`);
        console.log(`Businesses: ${businesses.length}`);
        console.log(`Spreadsheets: ${spreadsheets.length}`);
        console.log(`Customers: ${customers.length}`);
        console.log(`Companies: ${companies.length}`);
        console.log(`Templates: ${templates.length}`);
        console.log('\n=== DETAILS ===\n');

        if (users.length > 0) {
            console.log('Users:');
            users.forEach(u => {
                console.log(`  - ${u.username} (${u.email}) - Role: ${u.role || 'N/A'} - Business: ${u.business_id || 'N/A'}`);
            });
        }

        if (businesses.length > 0) {
            console.log('\nBusinesses:');
            businesses.forEach(b => {
                console.log(`  - ${b.name} (ID: ${b._id}) - Admin: ${b.admin_id}`);
            });
        }

        if (spreadsheets.length > 0) {
            console.log('\nSpreadsheets:');
            spreadsheets.forEach(s => {
                console.log(`  - ${s.name} - Business: ${s.business_id || 'N/A'} - Assigned Users: ${s.assigned_users?.length || 0}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDatabase();
