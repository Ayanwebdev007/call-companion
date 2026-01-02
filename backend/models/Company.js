import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: String,
    address: String,
    logo: String, // Base64 string
}, { timestamps: true });

export default mongoose.model('Company', CompanySchema);
