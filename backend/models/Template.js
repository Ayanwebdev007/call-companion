import mongoose from 'mongoose';

const TemplateSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    business_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    name: { type: String, required: true },
    poster: String, // Base64 string
    placeholders: {
        logo: { x: Number, y: Number },
        phone: { x: Number, y: Number },
        address: { x: Number, y: Number },
    },
}, { timestamps: true });

export default mongoose.model('Template', TemplateSchema);
