import express from 'express';
import metaService from '../services/metaService.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

// Webhook Verification (required by Meta)
router.get('/webhook', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('--- [META-WEBHOOK] VERIFICATION ATTEMPT ---');
    console.log('Full URL:', req.originalUrl);
    console.log('Query Params:', JSON.stringify(req.query, null, 2));

    if (mode === 'subscribe') {
        // Log all users with verify tokens for debugging
        const usersWithTokens = await User.find({
            'settings.metaVerifyToken': { $exists: true, $ne: '' }
        }).select('username settings.metaVerifyToken');

        console.log(`[META-WEBHOOK] Found ${usersWithTokens.length} user(s) with local verify tokens.`);

        // Log the search
        console.log(`[META-WEBHOOK] Searching for token: "${token}"`);

        const user = await User.findOne({ 'settings.metaVerifyToken': token });

        if (user) {
            console.log(`[META-WEBHOOK] Verification successful for user: ${user.username}`);
            return res.status(200).set('Content-Type', 'text/plain').send(challenge);
        }

        // Fallback to environment variable
        const globalToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
        if (globalToken && token === globalToken) {
            console.log('[META-WEBHOOK] Verification successful (Global Token)');
            return res.status(200).set('Content-Type', 'text/plain').send(challenge);
        }

        console.warn('[META-WEBHOOK] Verification failed: No matching verify token found.');
        return res.status(403).send('Verification failed');
    }

    console.warn('[META-WEBHOOK] Invalid mode received:', mode);
    return res.status(400).send('Invalid mode');
});

// Real-time Lead Reception
router.post('/webhook', async (req, res) => {
    console.log('--- [META-WEBHOOK] POST RECEIVED ---');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const body = req.body;

    // Acknowledge the event immediately to Meta to prevent timeouts
    res.status(200).send('EVENT_RECEIVED');

    if (body.object === 'page') {
        try {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'leadgen') {
                        const leadId = change.value.leadgen_id;
                        const pageId = String(change.value.page_id);

                        console.log(`[META-WEBHOOK] Processing lead: ${leadId} for Page: ${pageId}`);

                        // Find user by pageId
                        const user = await User.findOne({
                            'settings.metaPageId': pageId,
                            'settings.metaPageAccessToken': { $exists: true, $ne: '' }
                        });

                        if (!user) {
                            console.warn(`[META-WEBHOOK] ERROR: No user found for Meta Page ID: ${pageId}`);
                            continue;
                        }

                        console.log(`[META-WEBHOOK] Found user: ${user.username}`);

                        try {
                            const leadDetails = await metaService.getLeadDetails(leadId, user.settings.metaPageAccessToken);

                            // Find or create spreadsheet
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

                            // Duplicate check
                            const existing = await Customer.findOne({
                                user_id: user._id,
                                $or: [
                                    { remark: { $regex: leadId, $options: 'i' } },
                                    { email: leadDetails.email || 'NON_EXISTENT_EMAIL' }
                                ]
                            });

                            if (existing) {
                                console.log(`[META-WEBHOOK] Lead ${leadId} already exists as customer ${existing._id}`);
                                continue;
                            }

                            // Create initial customer
                            const customer = new Customer({
                                user_id: user._id,
                                spreadsheet_id: spreadsheet._id,
                                customer_name: leadDetails.customerName || 'Meta Lead',
                                company_name: leadDetails.companyName || 'Meta Ads',
                                phone_number: leadDetails.phoneNumber || 'N/A',
                                email: leadDetails.email || '',
                                remark: `Meta Lead ID: ${leadId}`,
                                status: 'new'
                            });

                            await customer.save();
                            console.log(`[META-WEBHOOK] Successfully saved lead ${leadId} as customer ${customer._id}`);
                        } catch (leadError) {
                            console.error(`[META-WEBHOOK] Error processing lead ${leadId}:`, leadError.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[META-WEBHOOK] Global processing error:', error);
        }
    } else {
        console.warn(`[META-WEBHOOK] Received object type ${body.object}, expected 'page'`);
    }
});

// Debug configuration status
router.get('/debug-config', async (req, res) => {
    try {
        const users = await User.find({
            'settings.metaPageAccessToken': { $exists: true, $ne: '' }
        }).select('username settings.metaPageId settings.metaVerifyToken').lean();

        const config = users.map(u => ({
            username: u.username,
            pageId: u.settings?.metaPageId || 'NOT SET',
            hasPageAccessToken: !!u.settings?.metaPageAccessToken,
            hasVerifyToken: !!u.settings?.metaVerifyToken
        }));

        res.json({
            message: 'Meta Webhook Diagnostic',
            users: config,
            globalTokenSet: !!process.env.META_WEBHOOK_VERIFY_TOKEN,
            serverTime: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual test endpoint to verify path reachability
router.post('/test-receive', (req, res) => {
    console.log('--- [META-WEBHOOK] MANUAL TEST RECEIVED ---');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    res.status(200).json({
        message: 'MANUAL_TEST_OK',
        receivedBody: req.body,
        timestamp: new Date().toISOString()
    });
});

export default router;

