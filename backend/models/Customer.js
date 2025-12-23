import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  spreadsheet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Spreadsheet', required: true },
  customer_name: { type: String, required: true },
  company_name: { type: String, required: true },
  phone_number: { type: String, required: true },
  next_call_date: { type: String, required: true, default: () => new Date().toISOString().split('T')[0] }, // Keeping as string to match frontend format "yyyy-MM-dd"
  next_call_time: { type: String, default: '' }, // New field for time (e.g., "14:30")
  last_call_date: { type: String, default: '' }, // New field for last call date
  remark: { type: String, default: '' },
  status: { type: String, enum: ['New', 'Called', 'Interested', 'Not Interested', 'Follow Up', 'Voicemail'], default: 'New' },
  color: { type: String, enum: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', null], default: null },
  position: { type: Number, default: 0 } // For drag and drop ordering
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for performance optimization
// Single field indexes for search
customerSchema.index({ spreadsheet_id: 1, customer_name: 1 });
customerSchema.index({ spreadsheet_id: 1, company_name: 1 });
customerSchema.index({ spreadsheet_id: 1, phone_number: 1 });

// Compound indexes for sorted queries
customerSchema.index({ spreadsheet_id: 1, position: 1 }); // For drag-drop ordering
customerSchema.index({ spreadsheet_id: 1, next_call_date: 1, next_call_time: 1 }); // For date-based filtering
customerSchema.index({ spreadsheet_id: 1, status: 1 }); // For status filtering
customerSchema.index({ user_id: 1, created_at: -1 }); // For user's recent customers

// Map _id to id
customerSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

export default mongoose.model('Customer', customerSchema);
