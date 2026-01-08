import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

console.log("Connecting to:", process.env.DATABASE_URL);

mongoose.connect(process.env.DATABASE_URL)
    .then(async () => {
        console.log('Connected to DB');
        const users = await User.find({ $or: [{ name: { $exists: false } }, { name: "" }] });
        console.log(`Found ${users.length} users to migrate.`);

        for (const u of users) {
            u.name = u.username;
            await u.save();
            console.log(`Migrated user: ${u.username} -> name: ${u.name}`);
        }
        console.log('Migration complete.');
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
