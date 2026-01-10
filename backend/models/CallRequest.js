import mongoose from 'mongoose';

const callRequestSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    phone_number: { type: String, required: true },
    customer_name: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'expired'],
        default: 'pending'
    },
    requested_at: { type: Date, default: Date.now },
    expires_at: { type: Date, default: () => new Date(Date.now() + 5 * 60 * 1000) }, // 5 minutes
    accepted_at: { type: Date },
    completed_at: { type: Date }
}, { timestamps: true });

// Index for quick lookup of pending requests
callRequestSchema.index({ user_id: 1, status: 1, requested_at: -1 });
callRequestSchema.index({ expires_at: 1 }); // For auto-cleanup

export default mongoose.model('CallRequest', callRequestSchema);
