import express from 'express';
import metaService from '../services/metaService.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

// Webhook Verification (required by Meta)
router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    console.log('--- WEBHOOK VERIFICATION ATTEMPT ---');
    console.log('Full URL with Query:', req.originalUrl);
    console.log('Query Params:', JSON.stringify(req.query, null, 2));
    console.log('Token Received:', token);
    console.log('Expected Token (from env):', verifyToken);

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('WEBHOOK_VERIFIED_SUCCESSFULLY');
        // Meta expects the challenge as a raw string
        return res.status(200).set('Content-Type', 'text/plain').send(challenge);
    } else {
        console.warn('WEBHOOK_VERIFICATION_FAILED');
        return res.status(mode && token ? 403 : 400).send('Verification failed. Check your tokens.');
    }
});

// Real-time Lead Reception
router.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.field === 'leadgen') {
                    const leadId = change.value.leadgen_id;
                    const pageId = change.value.page_id;

                    console.log(`New lead received: ${leadId} for Page: ${pageId}`);

                    try {
                        // Find user(s) associated with this Meta Page
                        // For now, we'll assume there's a setting in the User model or a separate MetaConfig model
                        // To keep it simple for now, we'll try to find any user who has a Meta Access Token set
                        // In a real multi-tenant app, you'd map Page IDs to specific User IDs.

                        const users = await User.find({ 'settings.metaPageAccessToken': { $exists: true, $ne: '' } });

                        if (users.length === 0) {
                            console.warn('No users found with Meta Access Token configured.');
                            continue;
                        }

                        // For simplicity, we'll process for the first user found or a specific master user
                        // Ideally, the metaService would fetch using the token of the user who owns that page.
                        const user = users[0];
                        const leadDetails = await metaService.getLeadDetails(leadId, user.settings.metaPageAccessToken);

                        // Ensure there's a spreadsheet for Meta leads
                        let spreadsheet = await mongoose.model('Spreadsheet').findOne({
                            user_id: user._id,
                            name: 'Meta Ads Leads'
                        });

                        if (!spreadsheet) {
                            spreadsheet = new (mongoose.model('Spreadsheet'))({
                                user_id: user._id,
                                name: 'Meta Ads Leads',
                                description: 'Leads automatically imported from Meta Ads'
                            });
                            await spreadsheet.save();
                        }

                        // Create new customer from lead
                        const customer = new Customer({
                            user_id: user._id,
                            spreadsheet_id: spreadsheet._id, // Set the spreadsheet ID
                            customer_name: leadDetails.customerName || 'Meta Lead',
                            company_name: leadDetails.companyName || 'Meta Ads',
                            phone_number: leadDetails.phoneNumber || 'N/A',
                            email: leadDetails.email || '',
                            remark: `Lead from Meta Ads Form. ID: ${leadId}`,
                            status: 'new'
                        });

                        await customer.save();
                        console.log(`Successfully saved lead ${leadId} as customer ${customer._id}`);
                    } catch (error) {
                        console.error('Error processing Meta lead:', error);
                    }
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

export default router;
