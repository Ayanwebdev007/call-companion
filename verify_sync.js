import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
    process.exit(1);
}

// Minimal Schemas
const customerSchema = new mongoose.Schema({
    user_id: mongoose.Schema.Types.ObjectId,
    business_id: mongoose.Schema.Types.ObjectId,
    status: String,
    meta_data: Map,
});

const Customer = mongoose.model('Customer', customerSchema);

async function run() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const businessId = new mongoose.Types.ObjectId();
        const user1 = new mongoose.Types.ObjectId();
        const user2 = new mongoose.Types.ObjectId();
        const leadId = "test-lead-123";

        // Create two leads with same lead_id but different owners (Shared sheet scenario)
        const c1 = new Customer({
            user_id: user1,
            business_id: businessId,
            status: 'New',
            meta_data: { meta_lead_id: leadId }
        });

        const c2 = new Customer({
            user_id: user2,
            business_id: businessId,
            status: 'New',
            meta_data: { meta_lead_id: leadId }
        });

        await c1.save();
        await c2.save();

        console.log(`Created 2 leads for Business ${businessId} with Lead ID ${leadId}`);

        // Simulate User 2 updating the lead
        const syncUpdate = { status: 'Contacted' };
        await Customer.updateMany(
            {
                business_id: businessId,
                'meta_data.meta_lead_id': leadId,
                _id: { $ne: c2._id }
            },
            { $set: syncUpdate }
        );

        const updatedC1 = await Customer.findById(c1._id);
        console.log(`User 1 lead status after User 2 update: ${updatedC1.status}`);

        if (updatedC1.status === 'Contacted') {
            console.log('SUCCESS: Cross-user synchronization verified!');
        } else {
            console.log('FAILURE: Synchronization failed.');
        }

        // Cleanup
        await Customer.deleteMany({ 'meta_data.meta_lead_id': leadId });
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

run();
