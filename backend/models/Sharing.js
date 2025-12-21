import mongoose from 'mongoose';

const sharingSchema = new mongoose.Schema({
  spreadsheet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Spreadsheet', required: true },
  owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shared_with_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  permission_level: { type: String, enum: ['read-only', 'read-write'], default: 'read-only' },
  created_at: { type: Date, default: Date.now }
});

// Ensure unique sharing combinations
sharingSchema.index({ spreadsheet_id: 1, shared_with_user_id: 1 }, { unique: true });

// Map _id to id
sharingSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

export default mongoose.model('Sharing', sharingSchema);