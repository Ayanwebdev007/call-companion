import express from 'express';
import auth from '../middleware/auth.js';
import Customer from '../models/Customer.js';
import CallLog from '../models/CallLog.js';
import CallRequest from '../models/CallRequest.js';
import User from '../models/User.js';
import { sendCallRequestToMobile } from '../socket.js';

const router = express.Router();

// @route   GET /api/mobile/verify
// @desc    Verify mobile connection and token validity
// @access  Private
router.get('/verify', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json({ status: 'connected', user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/mobile/request-call
// @desc    Create a call request (triggered from web dashboard)
// @access  Private
router.post('/request-call', auth, async (req, res) => {
    try {
        let { customer_id, phone_number, customer_name } = req.body;

        if (phone_number) phone_number = phone_number.trim();

        if (!customer_id || !phone_number || !customer_name) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Create call request
        const callRequest = await CallRequest.create({
            user_id: req.user.id,
            customer_id,
            phone_number,
            customer_name,
            status: 'pending'
        });

        // Send instant notification via WebSocket
        const sent = sendCallRequestToMobile(req.user.id, callRequest);

        res.json({
            success: true,
            request_id: callRequest._id,
            notification_sent: sent
        });

        console.log(`[Mobile] Call request created: ${callRequest._id} for ${customer_name}`);
    } catch (err) {
        console.error('[Mobile] Error creating call request:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/mobile/respond-call
// @desc    Mobile app responds to call request (accept/reject)
// @access  Private
router.post('/respond-call', auth, async (req, res) => {
    try {
        const { request_id, action } = req.body; // action: 'accept' | 'reject'

        if (!request_id || !action) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const callRequest = await CallRequest.findById(request_id);

        if (!callRequest) {
            return res.status(404).json({ message: 'Call request not found' });
        }

        if (callRequest.user_id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        callRequest.status = action === 'accept' ? 'accepted' : 'rejected';
        callRequest.accepted_at = action === 'accept' ? new Date() : null;
        await callRequest.save();

        res.json({ success: true, status: callRequest.status });

        console.log(`[Mobile] Call request ${action}ed: ${request_id}`);
    } catch (err) {
        console.error('[Mobile] Error responding to call:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/mobile/leads
// @desc    Get all assigned leads for the logged-in user (for local contact syncing)
// @access  Private
router.get('/leads', auth, async (req, res) => {
    try {
        // Fetch only necessary fields: Phone Number & Name
        // Ensure we only get active leads (not deleted) assigned to this user
        const leads = await Customer.find({
            user_id: req.user.id,
            is_deleted: false,
            phone_number: { $exists: true, $ne: '' }
        }).select('phone_number customer_name company_name status');

        res.json(leads);
    } catch (err) {
        console.error('[Mobile] Error fetching leads:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/mobile/sync-logs
// @desc    Sync call logs from mobile to CRM (ONLY for leads)
// @access  Private
router.post('/sync-logs', auth, async (req, res) => {
    const { logs } = req.body; // Expecting array of { phoneNumber, type, duration, timestamp }

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
        return res.status(400).json({ message: 'No logs provided' });
    }

    try {
        // First, get all lead phone numbers for this user
        const leads = await Customer.find({
            user_id: req.user.id,
            is_deleted: false,
            phone_number: { $exists: true, $ne: '' }
        }).select('phone_number _id');

        // Create a map for quick lookup: phoneNumber -> customer_id
        const leadPhoneMap = new Map();
        leads.forEach(lead => {
            leadPhoneMap.set(lead.phone_number, lead._id);
        });

        let syncedCount = 0;

        for (const log of logs) {
            const { phoneNumber, type, duration, timestamp, note, status } = log;

            // Normalize phone number (remove non-digits for safer matching)
            const normalizedPhone = phoneNumber.replace(/\D/g, '');

            // FILTER: Only process if this number is in our leads
            const customerId = leadPhoneMap.get(phoneNumber);

            if (customerId) {
                // Check for a pending log to update first (from One-Click flow)
                let existingLog = await CallLog.findOne({
                    user_id: req.user.id,
                    phone_number: phoneNumber,
                    status: 'pending'
                }).sort({ timestamp: -1 });

                if (existingLog && status === 'completed') {
                    existingLog.duration = duration;
                    existingLog.status = 'completed';
                    existingLog.timestamp = new Date(timestamp);
                    existingLog.note = note || 'One-Click Call completed';
                    existingLog.synced_from_mobile = true;
                    await existingLog.save();
                } else {
                    const exists = await CallLog.findOne({
                        user_id: req.user.id,
                        phone_number: phoneNumber,
                        timestamp: new Date(timestamp),
                        duration: duration,
                        status: 'completed'
                    });

                    if (!exists) {
                        await CallLog.create({
                            user_id: req.user.id,
                            customer_id: customerId,
                            phone_number: phoneNumber,
                            call_type: type.toLowerCase(),
                            duration: duration,
                            timestamp: new Date(timestamp),
                            synced_from_mobile: true,
                            note: note || '',
                            status: status || 'completed'
                        });
                    }
                }

                // Update Customer "Last Call" info
                const customer = await Customer.findById(customerId);
                if (customer) {
                    const logDate = new Date(timestamp);
                    const logDateStr = logDate.toISOString().split('T')[0];

                    if (!customer.last_call_date || logDateStr >= customer.last_call_date) {
                        customer.last_call_date = logDateStr;
                        await customer.save();
                    }
                }

                syncedCount++;
            }
        }

        res.json({
            message: 'Sync complete',
            synced: syncedCount,
            received: logs.length,
            filtered: logs.length - syncedCount
        });

    } catch (err) {
        console.error('[Mobile] Sync error:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/mobile/logs/:phoneNumber
// @desc    Get call logs for a specific phone number
// @access  Private
router.get('/logs/:phoneNumber', auth, async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        const logs = await CallLog.find({
            user_id: req.user.id,
            phone_number: phoneNumber
        }).sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (err) {
        console.error('[Mobile] Error fetching logs:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/mobile/call-logs/:customerId
// @desc    Get all call logs for a specific customer
// @access  Private
router.get('/call-logs/:customerId', auth, async (req, res) => {
    try {
        const { customerId } = req.params;

        const logs = await CallLog.find({
            user_id: req.user.id,
            customer_id: customerId
        }).sort({ timestamp: -1 });

        res.json(logs);
    } catch (err) {
        console.error('[Mobile] Error fetching customer call logs:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/mobile/match-number/:phoneNumber
// @desc    Match a phone number to an existing lead
// @access  Private
router.get('/match-number/:phoneNumber', auth, async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        const normalizedPhone = phoneNumber.replace(/\D/g, '');

        // Search for a customer with this phone number
        // We look for exact match or potentially normalized match if we store it that way
        const leads = await Customer.find({
            user_id: req.user.id,
            is_deleted: false,
            $or: [
                { phone_number: phoneNumber },
                { phone_number: { $regex: new RegExp(normalizedPhone + '$') } }
            ]
        }).select('customer_name company_name phone_number status');

        if (leads.length > 0) {
            res.json({
                match: true,
                leads, // Return all matching leads for Scenario B
                multiple: leads.length > 1
            });
        } else {
            res.json({ match: false });
        }
    } catch (err) {
        console.error('[Mobile] Match number error:', err.message);
        res.status(500).send('Server error');
    }
});

export default router;
