import mongoose from 'mongoose';
import './models/Customer.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/call-companion');
        const lead = await mongoose.model('Customer').findOne({ 'meta_data.meta_lead_id': { $exists: true } }).lean();
        console.log(JSON.stringify(lead, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
