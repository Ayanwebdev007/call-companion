import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
    console.error('MONGODB_URI not found in backend/.env');
    process.exit(1);
}

// Define Schemas to match existing ones
const customerSchema = new mongoose.Schema({
    customer_name: String,
    spreadsheet_id: mongoose.Schema.Types.ObjectId,
    meta_data: Map,
});

const spreadsheetSchema = new mongoose.Schema({
    name: String,
    page_name: String,
    form_name: String,
    is_master: Boolean,
});

const Customer = mongoose.model('Customer', customerSchema);
const Spreadsheet = mongoose.model('Spreadsheet', spreadsheetSchema);

async function run() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const searchName = "GS3 Solution - Search Campaign - Search Ad";
        console.log(`Searching for spreadsheets matching: "${searchName}"`);

        const sheets = await Spreadsheet.find({ name: { $regex: "GS3 Solution", $options: 'i' } });
        console.log(`Found ${sheets.length} spreadsheets containing "GS3 Solution"`);

        for (const sheet of sheets) {
            const count = await Customer.countDocuments({ spreadsheet_id: sheet._id });
            console.log(`- Sheet: "${sheet.name}" ID: ${sheet._id} (Master: ${sheet.is_master}) - Leads: ${count}`);
            if (sheet.name === searchName && count === 0) {
                console.log(`  !!! This is the empty sheet the user is reporting.`);
            }
        }

        // Try to find if leads exist with meta_page "GS3 Solution"
        const leadsByMeta = await Customer.countDocuments({ "meta_data.meta_page": "GS3 Solution" });
        console.log(`Total leads in DB with meta_page "GS3 Solution": ${leadsByMeta}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

run();
