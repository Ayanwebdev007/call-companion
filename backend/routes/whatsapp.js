import express from 'express';
import whatsappService from '../services/whatsappService.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get Status (and QR if connecting)
router.get('/status', auth, (req, res) => {
    const status = whatsappService.getStatus(req.user.id);
    if (status.status === 'disconnected') {
        whatsappService.connect(req.user.id);
    }
    res.json(status);
});

// Explicitly request a reconnect/QR if needed
router.post('/connect', auth, (req, res) => {
    whatsappService.connect(req.user.id);
    res.json({ message: 'Initializing connection...' });
});

// Send Message
router.post('/send', auth, async (req, res) => {
    try {
        const { phone, message, image } = req.body;
        console.log(`[WhatsApp Route] User ${req.user.id} sending to:`, { phone, message, image: image ? 'present' : 'none' });

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        await whatsappService.sendMessage(req.user.id, phone, message, image);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('[WhatsApp Route] Error:', error);
        res.status(500).json({ message: error.message || 'Failed to send message' });
    }
});

// Logout
router.post('/logout', auth, async (req, res) => {
    await whatsappService.logout(req.user.id);
    res.json({ message: 'Logged out successfully' });
});

export default router;
