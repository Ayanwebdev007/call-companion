const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/calling-crm', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const Spreadsheet = require('./models/Spreadsheet');

async function cleanColumnMappings() {
    try {
        console.log('🔍 Scanning for spreadsheets with problematic column_mapping...');

        // Find all meta spreadsheets
        const metaSpreadsheets = await Spreadsheet.find({
            is_meta: true,
            column_mapping: { $exists: true, $ne: null }
        });

        console.log(`📊 Found ${metaSpreadsheets.length} Meta spreadsheets with column mappings`);

        for (const sheet of metaSpreadsheets) {
            const oldMapping = sheet.column_mapping;
            const newMapping = {};

            // Copy all fields EXCEPT customer_name, phone_number, company_name
            for (const [key, value] of Object.entries(oldMapping)) {
                if (key !== 'customer_name' && key !== 'phone_number' && key !== 'company_name') {
                    newMapping[key] = value;
                }
            }

            // Update the spreadsheet
            sheet.column_mapping = Object.keys(newMapping).length > 0 ? newMapping : null;
            await sheet.save();

            console.log(`✅ Cleaned "${sheet.name}":`);
            console.log(`   Before: ${Object.keys(oldMapping).join(', ')}`);
            console.log(`   After:  ${Object.keys(newMapping).join(', ') || 'null (will use default)'}`);
        }

        console.log('\n✨ Database cleanup complete!');
        console.log('👉 Now deploy the frontend fix and try exporting again.');

        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cleaning column mappings:', error);
        mongoose.connection.close();
        process.exit(1);
    }
}

cleanColumnMappings();
