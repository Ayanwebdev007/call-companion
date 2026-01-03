import express from 'express';
const router = express.Router();
import whatsappService from '../services/whatsappService.js';

// Get Status (and QR if connecting)
router.get('/status', (req, res) => {
    res.json(whatsappService.getStatus());
});

// Explicitly request a reconnect/QR if needed (optional)
router.post('/connect', (req, res) => {
    whatsappService.connect();
    res.json({ message: 'Initializing connection...' });
});

// Send Message
router.post('/send', async (req, res) => {
    try {
        const { phone, message, image } = req.body;
        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        await whatsappService.sendMessage(phone, message, image);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Failed to send message' });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    await whatsappService.logout();
    res.json({ message: 'Logged out successfully' });
});

export default router;
