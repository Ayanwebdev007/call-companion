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
                                metaService.getFormDetails(change.value.form_id || leadDetails.rawData.form_id, pageAccessToken),
                                (change.value.ad_id || leadDetails.adId)
                                    ? metaService.getAdDetails(change.value.ad_id || leadDetails.adId, pageAccessToken)
                                    : Promise.resolve(null)
                            ]);



                            const pageName = pageInfo?.name || pageId;
                            const formName = formInfo?.name || 'Meta Form';

                            // Use metadata directly from the Lead object if available (more reliable with Page Token)
                            const campaignName = leadDetails.campaignName || adInfo?.campaign?.name || adInfo?.name || 'Search Campaign';
                            const adSetName = leadDetails.adSetName || adInfo?.adset?.name || 'Search Ad Set';
                            const adName = leadDetails.adName || adInfo?.name || 'Search Ad';

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

        // 2. Fetch Recent Leads (Deduplicated by Lead ID)
        const recentLeadsUnique = await Customer.aggregate([
            { $match: { spreadsheet_id: { $in: sheetIds } } },
            { $sort: { created_at: -1 } },
            {
                $group: {
                    _id: { $ifNull: ["$meta_data.meta_lead_id", "$_id"] },
                    doc: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$doc" } },
            { $sort: { created_at: -1 } },
            { $limit: 40 }
        ]);

        const SpreadsheetModel = mongoose.model('Spreadsheet');
        const recentLeads = await SpreadsheetModel.populate(recentLeadsUnique, { path: 'spreadsheet_id', select: 'name page_name form_name is_master' });

        // 3. Stats & Aggregations (Deduplicated by Lead ID)
        const leadGroupMatch = { spreadsheet_id: { $in: sheetIds } };
        const now = new Date();
        const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
        const startOfWeek = new Date(new Date().setDate(now.getDate() - now.getDay()));
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Core Aggregation: Deduplicate leads across all sheets first
        const uniqueLeads = await Customer.aggregate([
            { $match: leadGroupMatch },
            {
                $group: {
                    _id: { $ifNull: ["$meta_data.meta_lead_id", "$_id"] },
                    status: { $first: "$status" },
                    created_at: { $first: "$created_at" },
                    page: { $first: { $ifNull: ["$meta_data.meta_page", "Unknown"] } },
                    form: { $first: { $ifNull: ["$meta_data.meta_form", "Unknown"] } },
                    campaign: { $first: { $ifNull: ["$meta_data.meta_campaign", "Unknown"] } },
                    adSet: { $first: { $ifNull: ["$meta_data.meta_ad_set", "Unknown"] } },
                    ad: { $first: { $ifNull: ["$meta_data.meta_ad", "Unknown"] } }
                }
            }
        ]);

        let leadsToday = 0;
        let leadsThisWeek = 0;
        let totalLeads = uniqueLeads.length;
        const pageLeads = {};
        const formLeads = {};
        const campaignLeads = {};
        const adSetLeads = {};
        const adLeads = {};
        const dateLeads = {};
        const statusDistribution = {};

        uniqueLeads.forEach(lead => {
            const createdAt = new Date(lead.created_at);
            if (createdAt >= startOfDay) leadsToday++;
            if (createdAt >= startOfWeek) leadsThisWeek++;

            if (lead.page) pageLeads[lead.page] = (pageLeads[lead.page] || 0) + 1;
            if (lead.form) formLeads[lead.form] = (formLeads[lead.form] || 0) + 1;
            if (lead.campaign) campaignLeads[lead.campaign] = (campaignLeads[lead.campaign] || 0) + 1;
            if (lead.adSet) adSetLeads[lead.adSet] = (adSetLeads[lead.adSet] || 0) + 1;
            if (lead.ad) adLeads[lead.ad] = (adLeads[lead.ad] || 0) + 1;

            const dateStr = createdAt.toISOString().split('T')[0];
            if (createdAt >= thirtyDaysAgo) {
                dateLeads[dateStr] = (dateLeads[dateStr] || 0) + 1;
            }

            const status = (lead.status || 'new').toLowerCase();
            statusDistribution[status] = (statusDistribution[status] || 0) + 1;
        });

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

