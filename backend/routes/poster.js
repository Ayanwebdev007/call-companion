import express from 'express';
import auth from '../middleware/auth.js';
import Company from '../models/Company.js';
import Template from '../models/Template.js';

const router = express.Router();

// Get all companies for the logged-in user
router.get('/companies', auth, async (req, res) => {
    try {
        const companies = await Company.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json({ companies });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Create a new company
router.post('/companies', auth, async (req, res) => {
    try {
        const { name, phone, address, logo } = req.body;

        if (!name || !phone || !address || !logo) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const newCompany = new Company({
            user: req.user.id,
            name,
            phone,
            address,
            logo
        });

        const company = await newCompany.save();
        res.json({ company });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get all templates for the logged-in user
router.get('/templates', auth, async (req, res) => {
    try {
        const templates = await Template.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json({ templates });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Create a new template
router.post('/templates', auth, async (req, res) => {
    try {
        const { poster, placeholders } = req.body;

        if (!poster || !placeholders) {
            return res.status(400).json({ message: 'Poster image and placeholders are required' });
        }

        const newTemplate = new Template({
            user: req.user.id,
            poster,
            placeholders
        });

        const template = await newTemplate.save();
        res.json({ template });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
