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

async function migrateToBusiness() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB\n');

        // Step 1: Find all users
        const users = await User.find({}).lean();
        console.log(`Found ${users.length} users`);

        if (users.length === 0) {
            console.log('No users found. Exiting...');
            process.exit(0);
        }

        // Step 2: Check if a business already exists
        let business = await Business.findOne({});

        if (!business) {
            // Create a new business
            const firstUser = users[0];
            business = new Business({
                name: 'Main Business',
                admin_id: firstUser._id,
                contact: {
                    phone: '',
                    address: ''
                },
                logo: '',
                settings: {
                    meta_webhook_verify_token: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
                    meta_page_access_token: process.env.META_PAGE_ACCESS_TOKEN || '',
                    meta_page_id: process.env.META_PAGE_ID || ''
                }
            });
            await business.save();
            console.log(`Created business: ${business.name} (ID: ${business._id})\n`);
        } else {
            console.log(`Using existing business: ${business.name} (ID: ${business._id})\n`);
        }

        // Step 3: Update all users to belong to this business
        console.log('Updating users...');
        for (const userData of users) {
            const isAdmin = userData._id.toString() === business.admin_id.toString();

            // Build update object
            const updateData = {
                business_id: business._id,
                role: isAdmin ? 'admin' : 'user',
                permissions: ['dashboard', 'poster', 'webhooks']
            };

            // Add email if missing
            if (!userData.email) {
                updateData.email = `${userData.username}@placeholder.local`;
                console.log(`  Adding placeholder email for: ${userData.username}`);
            }

            await User.updateOne({ _id: userData._id }, { $set: updateData });
            console.log(`  ✓ Updated: ${userData.username} - Role: ${updateData.role}`);
        }

        // Step 4: Get all spreadsheets
        const spreadsheets = await Spreadsheet.find({});
        console.log(`\nFound ${spreadsheets.length} spreadsheets`);

        // Step 5: Assign all spreadsheets to the business and all users
        const allUserIds = users.map(u => u._id);
        console.log('Updating spreadsheets...');

        for (const sheet of spreadsheets) {
            await Spreadsheet.updateOne(
                { _id: sheet._id },
                {
                    $set: {
                        business_id: business._id,
                        assigned_users: allUserIds
                    }
                }
            );
            console.log(`  ✓ ${sheet.name} - Assigned ${allUserIds.length} users`);
        }

        // Step 6: Update all customers to belong to the business
        const customerCount = await Customer.countDocuments({});
        console.log(`\nFound ${customerCount} customers`);

        if (customerCount > 0) {
            await Customer.updateMany({}, { $set: { business_id: business._id } });
            console.log(`  ✓ Updated all ${customerCount} customers`);
        }

        // Step 7: Update all companies (for poster generator)
        const companyCount = await Company.countDocuments({});
        console.log(`\nFound ${companyCount} companies`);

        if (companyCount > 0) {
            await Company.updateMany({}, { $set: { business_id: business._id } });
            console.log(`  ✓ Updated all ${companyCount} companies`);
        }

        // Step 8: Update all templates
        const templateCount = await Template.countDocuments({});
        console.log(`\nFound ${templateCount} templates`);

        if (templateCount > 0) {
            await Template.updateMany({}, { $set: { business_id: business._id } });
            console.log(`  ✓ Updated all ${templateCount} templates`);
        }

        // Get admin user details
        const adminUser = await User.findById(business.admin_id);

        console.log('\n' + '='.repeat(50));
        console.log('MIGRATION COMPLETED SUCCESSFULLY');
        console.log('='.repeat(50));
        console.log(`\nBusiness: ${business.name}`);
        console.log(`Admin: ${adminUser.username} (${adminUser.email})`);
        console.log(`\nData Summary:`);
        console.log(`  • Users: ${users.length}`);
        console.log(`  • Spreadsheets: ${spreadsheets.length}`);
        console.log(`  • Customers: ${customerCount}`);
        console.log(`  • Companies: ${companyCount}`);
        console.log(`  • Templates: ${templateCount}`);
        console.log(`\n✓ All users have full permissions (dashboard, poster, webhooks)`);
        console.log(`✓ All users have access to all ${spreadsheets.length} forms`);
        console.log(`✓ No data was deleted - everything migrated successfully!\n`);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

migrateToBusiness();
