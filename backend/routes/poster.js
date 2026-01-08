import express from 'express';
import auth from '../middleware/auth.js';
import checkPermission from '../middleware/permissions.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Template from '../models/Template.js';

const router = express.Router();

// Get all companies for the business
router.get('/companies', auth, checkPermission('poster'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const companies = await Company.find({ business_id: user.business_id }).sort({ createdAt: -1 });
        res.json({ companies });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Create a new company
router.post('/companies', auth, checkPermission('poster'), async (req, res) => {
    try {
        const { name, phone, address, logo } = req.body;

        if (!name || !phone || !address || !logo) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const user = await User.findById(req.user.id);
        const newCompany = new Company({
            user: req.user.id,
            business_id: user.business_id,
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

// Update a company
router.put('/companies/:id', auth, async (req, res) => {
    try {
        const { name, phone, address, logo } = req.body;

        const currentUser = await User.findById(req.user.id);
        let company = await Company.findById(req.params.id);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        // Ensure user belongs to the same business
        if (company.business_id.toString() !== currentUser.business_id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        company.name = name || company.name;
        company.phone = phone || company.phone;
        company.address = address || company.address;
        if (logo) company.logo = logo;

        await company.save();
        res.json({ company });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get all templates for the business
router.get('/templates', auth, checkPermission('poster'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const templates = await Template.find({ business_id: user.business_id }).sort({ createdAt: -1 });
        res.json({ templates });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Create a new template
router.post('/templates', auth, checkPermission('poster'), async (req, res) => {
    try {
        const { name, poster, placeholders } = req.body;

        if (!name || !poster || !placeholders) {
            return res.status(400).json({ message: 'Template Name, Poster image and placeholders are required' });
        }

        const user = await User.findById(req.user.id);
        const newTemplate = new Template({
            user: req.user.id,
            business_id: user.business_id,
            name,
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

// Update a template
router.put('/templates/:id', auth, async (req, res) => {
    try {
        const { name, poster, placeholders } = req.body;

        const currentUser = await User.findById(req.user.id);
        let template = await Template.findById(req.params.id);
        if (!template) return res.status(404).json({ message: 'Template not found' });

        if (template.business_id.toString() !== currentUser.business_id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        template.name = name || template.name;
        if (poster) template.poster = poster;
        template.placeholders = placeholders || template.placeholders;

        await template.save();
        res.json({ template });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
