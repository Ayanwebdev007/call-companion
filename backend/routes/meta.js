import express from 'express';
import metaService from '../services/metaService.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';

const router = express.Router();

// Webhook Verification (required by Meta)
router.get('/webhook', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`[META-WEBHOOK] Verification attempt: ${mode}`);

    if (mode === 'subscribe') {
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
    console.log('[META-WEBHOOK] Lead event received');

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



                        // Find user by pageId (either legacy field or in metaPages array)
                        const user = await User.findOne({
                            $or: [
                                { 'settings.metaPageId': pageId },
                                { 'settings.metaPages.pageId': pageId }
                            ]
                        });

                        if (!user) {
                            console.warn(`[META-WEBHOOK] ERROR: No user found for Meta Page ID: ${pageId}`);
                            continue;
                        }

                        // Determine the correct access token for this specific page
                        let pageAccessToken = user.settings.metaPageAccessToken; // Default to legacy token

                        const specificPage = user.settings.metaPages?.find(p => p.pageId === pageId);
                        if (specificPage?.pageAccessToken) {
                            pageAccessToken = specificPage.pageAccessToken;
                        }

                        if (!pageAccessToken) {
                            console.warn(`[META-WEBHOOK] ERROR: No access token found for Page ID: ${pageId} (User: ${user.username})`);
                            continue;
                        }



                        try {
                            const leadDetails = await metaService.getLeadDetails(leadId, pageAccessToken);

                            // Fetch granular details
                            const [pageInfo, formInfo, adInfo] = await Promise.all([
                                metaService.getPageDetails(pageId, pageAccessToken),
                                metaService.getFormDetails(change.value.form_id, pageAccessToken),
                                metaService.getAdDetails(change.value.ad_id, pageAccessToken)
                            ]);



                            const pageName = pageInfo?.name || pageId;
                            const formName = formInfo?.name || 'Meta Form';

                            // Use metadata directly from the Lead object if available (more reliable with Page Token)
                            const campaignName = leadDetails.campaignName || adInfo?.campaign?.name || 'Standard Campaign';
                            const adSetName = leadDetails.adSetName || adInfo?.adset?.name || 'Standard Ad Set';
                            const adName = leadDetails.adName || adInfo?.name || 'Standard Ad';

                            // Create a descriptive spreadsheet name
                            // User wants spreadsheet to appear based on Page, Form, Campaign, Ad Set, Ad.
                            const spreadsheetName = `${pageName} - ${campaignName} - ${adName}`;

                            // Find or create AD-SPECIFIC spreadsheet
                            // Must match ALL criteria to ensure separation
                            let adSpreadsheet = await mongoose.model('Spreadsheet').findOne({
                                user_id: user._id,
                                page_name: pageName,
                                form_name: formName,
                                campaign_name: campaignName,
                                ad_set_name: adSetName,
                                ad_name: adName,
                                is_master: false
                            });

                            if (!adSpreadsheet) {
                                adSpreadsheet = new (mongoose.model('Spreadsheet'))({
                                    user_id: user._id,
                                    name: spreadsheetName,
                                    description: `Leads from Page: ${pageName}, Form: ${formName}, Campaign: ${campaignName}, Ad Set: ${adSetName}, Ad: ${adName}`,
                                    page_name: pageName,
                                    form_name: formName,
                                    campaign_name: campaignName,
                                    ad_set_name: adSetName,
                                    ad_name: adName,
                                    is_meta: true,
                                    is_master: false
                                });
                                await adSpreadsheet.save();
                            }

                            // Find or create MASTER spreadsheet (Page + Form only)
                            const masterSpreadsheetName = `[MASTER] ${pageName} - ${formName}`;
                            let masterSpreadsheet = await mongoose.model('Spreadsheet').findOne({
                                user_id: user._id,
                                page_name: pageName,
                                form_name: formName,
                                is_master: true
                            });

                            if (!masterSpreadsheet) {
                                masterSpreadsheet = new (mongoose.model('Spreadsheet'))({
                                    user_id: user._id,
                                    name: masterSpreadsheetName,
                                    description: `REAL-TIME MASTER: Aggregated leads for Page: ${pageName}, Form: ${formName}`,
                                    page_name: pageName,
                                    form_name: formName,
                                    is_meta: true,
                                    is_master: true
                                });
                                await masterSpreadsheet.save();

                            }

                            // Define helper to save lead to a spreadsheet
                            const saveLeadToSpreadsheet = async (targetSpreadsheet) => {
                                // Duplicate check scoped to THIS spreadsheet
                                const existing = await Customer.findOne({
                                    user_id: user._id,
                                    spreadsheet_id: targetSpreadsheet._id,
                                    $or: [
                                        { remark: { $regex: leadId, $options: 'i' } },
                                        { email: leadDetails.email || 'NON_EXISTENT_EMAIL' }
                                        // Phone number uniqueness is NOT enforced as per request
                                    ]
                                });

                                if (existing) {
                                    console.log(`[META-WEBHOOK] Lead ${leadId} already exists in sheet ${targetSpreadsheet.name} (${targetSpreadsheet._id})`);
                                    return;
                                }

                                const customer = new Customer({
                                    user_id: user._id,
                                    spreadsheet_id: targetSpreadsheet._id,
                                    customer_name: leadDetails.customerName || 'Meta Lead',
                                    company_name: leadDetails.companyName || 'Meta Ads',
                                    phone_number: leadDetails.phoneNumber || 'N/A',
                                    email: leadDetails.email || '',
                                    remark: '', // CLEAN: Remarks are left empty for user notes
                                    meta_data: {
                                        ...(leadDetails.fieldMap || {}),
                                        // Store system metadata in meta_data instead of remark
                                        meta_campaign: campaignName,
                                        meta_ad_set: adSetName,
                                        meta_ad: adName,
                                        meta_lead_id: leadId,
                                        meta_form: formName,
                                        meta_page: pageName
                                    },
                                    status: 'new'
                                });

                                await customer.save();

                                // Update headers
                                const leadHeaders = Object.keys(leadDetails.fieldMap || {});
                                if (leadHeaders.length > 0) {
                                    const currentHeaders = targetSpreadsheet.meta_headers || [];
                                    const newHeaders = [...new Set([...currentHeaders, ...leadHeaders])];

                                    if (newHeaders.length !== currentHeaders.length) {
                                        targetSpreadsheet.meta_headers = newHeaders;
                                        await targetSpreadsheet.save();
                                        console.log(`[META-WEBHOOK] Updated headers for ${targetSpreadsheet.name}`);
                                    }
                                }
                                console.log(`[META-WEBHOOK] Lead ${leadId} -> ${targetSpreadsheet.name}`);
                            };

                            // Execution: Save to BOTH
                            await Promise.all([
                                saveLeadToSpreadsheet(adSpreadsheet),
                                saveLeadToSpreadsheet(masterSpreadsheet)
                            ]);
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

// Fetch Page Details for UI setup
router.get('/page-details', async (req, res) => {
    const { pageId, token } = req.query;
    if (!pageId || !token) {
        return res.status(400).json({ error: 'pageId and token are required' });
    }

    try {
        const details = await metaService.getPageDetails(pageId, token);
        res.json(details);
    } catch (error) {
        res.status(500).json({ error: error.message });
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

// Fetch Detailed Meta Analytics & Global Lead Feed
router.get('/analytics', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const mongoose = await import('mongoose');

        // 1. Fetch all Meta spreadsheets (owned or shared)
        const Spreadsheet = mongoose.default.model('Spreadsheet');
        const Sharing = mongoose.default.model('Sharing');

        // Find sheets owned by user
        const ownedSheets = await Spreadsheet.find({ user_id: userId, is_meta: true });

        // Find sheets shared with user
        const sharedRecords = await Sharing.find({ shared_with_user_id: userId });
        const sharedSheetIds = sharedRecords.map(r => r.spreadsheet_id);
        const sharedSheets = await Spreadsheet.find({ _id: { $in: sharedSheetIds }, is_meta: true });

        const allMetaSheets = [...ownedSheets, ...sharedSheets];
        const sheetIds = allMetaSheets.map(s => s._id);

        // 2. Fetch Recent Leads across all these sheets
        const recentLeads = await Customer.find({
            spreadsheet_id: { $in: sheetIds }
        })
            .sort({ created_at: -1 })
            .limit(50)
            .populate('spreadsheet_id', 'name page_name form_name is_master');

        // 3. Stats: Velocity (Today, Week)
        const now = new Date();
        const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
        const startOfWeek = new Date(new Date().setDate(now.getDate() - now.getDay()));

        const [leadsToday, leadsThisWeek, totalLeads] = await Promise.all([
            Customer.countDocuments({ spreadsheet_id: { $in: sheetIds }, created_at: { $gte: startOfDay } }),
            Customer.countDocuments({ spreadsheet_id: { $in: sheetIds }, created_at: { $gte: startOfWeek } }),
            Customer.countDocuments({ spreadsheet_id: { $in: sheetIds } })
        ]);

        // 4. Aggregations for Charts (Leads per Page, Leads per Form, Status Distribution)
        const leadsBySheet = await Customer.aggregate([
            { $match: { spreadsheet_id: { $in: sheetIds } } },
            { $group: { _id: "$spreadsheet_id", count: { $sum: 1 } } }
        ]);

        // 5. New Granular Aggregations (Campaign, AdSet, Ad)
        // Note: These fields are in meta_data Map. MongoDB 4.4+ supports Map aggregation.
        const granularData = await Customer.aggregate([
            { $match: { spreadsheet_id: { $in: sheetIds } } },
            {
                $group: {
                    _id: null,
                    campaigns: { $push: "$meta_data.meta_campaign" },
                    adSets: { $push: "$meta_data.meta_ad_set" },
                    ads: { $push: "$meta_data.meta_ad" }
                }
            }
        ]);

        // Helper to count frequencies in an array
        const getCounts = (arr) => arr.reduce((acc, val) => {
            if (val) acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});

        const campaignLeads = granularData[0] ? getCounts(granularData[0].campaigns) : {};
        const adSetLeads = granularData[0] ? getCounts(granularData[0].adSets) : {};
        const adLeads = granularData[0] ? getCounts(granularData[0].ads) : {};

        // 6. Leads by Date (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const leadsByDateRaw = await Customer.aggregate([
            { $match: { spreadsheet_id: { $in: sheetIds }, created_at: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const dateLeads = {};
        leadsByDateRaw.forEach(item => { dateLeads[item._id] = item.count; });

        // Map counts back to sheets for page/form grouping
        const pageLeads = {};
        const formLeads = {};
        const statusDistribution = {};

        leadsBySheet.forEach(item => {
            const sheet = allMetaSheets.find(s => s._id.toString() === item._id.toString());
            if (sheet) {
                const page = sheet.page_name || 'Unknown Page';
                const form = sheet.form_name || 'Unknown Form';
                pageLeads[page] = (pageLeads[page] || 0) + item.count;
                formLeads[form] = (formLeads[form] || 0) + item.count;
            }
        });

        // Global Status Distribution
        const statuses = await Customer.aggregate([
            { $match: { spreadsheet_id: { $in: sheetIds } } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        statuses.forEach(s => { statusDistribution[s._id || 'New'] = s.count; });

        res.json({
            recentLeads,
            stats: {
                leadsToday,
                leadsThisWeek,
                totalLeads
            },
            charts: {
                pageLeads,
                formLeads,
                campaignLeads,
                adSetLeads,
                adLeads,
                dateLeads,
                statusDistribution
            }
        });
    } catch (error) {
        console.error('[META-ANALYTICS] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

