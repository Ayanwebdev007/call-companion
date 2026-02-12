import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false }, // Optional: might be a known number but deleted customer? Or strict ref? Plan says "is this number a CRM lead?". If yes, we link it.
    phone_number: { type: String, required: true },
    call_type: { type: String, enum: ['incoming', 'outgoing', 'missed', 'rejected', 'blocked', 'unknown'], required: true },
    duration: { type: Number, default: 0 }, // Duration in seconds
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    synced_from_mobile: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'completed'], default: 'completed' }
}, { timestamps: true });

// Index for quick lookup by customer or phone
callLogSchema.index({ customer_id: 1, timestamp: -1 });
callLogSchema.index({ phone_number: 1, timestamp: -1 });
callLogSchema.index({ user_id: 1, timestamp: -1 });

export default mongoose.model('CallLog', callLogSchema);
