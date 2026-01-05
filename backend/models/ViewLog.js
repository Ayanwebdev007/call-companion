import mongoose from 'mongoose';

const viewLogSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    spreadsheet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Spreadsheet', required: true },
    last_viewed_at: { type: Date, default: Date.now }
});

// Ensure unique combination of user and spreadsheet
viewLogSchema.index({ user_id: 1, spreadsheet_id: 1 }, { unique: true });

export default mongoose.model('ViewLog', viewLogSchema);
