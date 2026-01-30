import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  business_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  spreadsheet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Spreadsheet', required: true },
  customer_name: { type: String, required: true },
  company_name: { type: String, required: true },
  phone_number: { type: String, required: true },
  next_call_date: { type: String, required: true, default: () => new Date().toISOString().split('T')[0] }, // Keeping as string to match frontend format "yyyy-MM-dd"
  next_call_time: { type: String, default: '' }, // New field for time (e.g., "14:30")
  last_call_date: { type: String, default: '' }, // New field for last call date
  remark: { type: String, default: '' },
  meta_data: { type: Map, of: String, default: {} },
  color: { type: String, enum: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', null], default: null },
  status: { type: String, default: 'new' },
  position: { type: Number, default: 0 }, // For drag and drop ordering
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes to support search within a spreadsheet
customerSchema.index({ spreadsheet_id: 1, customer_name: 1 });
customerSchema.index({ spreadsheet_id: 1, company_name: 1 });
customerSchema.index({ spreadsheet_id: 1, phone_number: 1 });

// Index for positioning and sorting
customerSchema.index({ spreadsheet_id: 1, position: 1, next_call_date: 1, next_call_time: 1 });
customerSchema.index({ spreadsheet_id: 1, position: -1 });

// Index for Meta deduplication and syncing
customerSchema.index({ business_id: 1, 'meta_data.meta_lead_id': 1 });

// Index for business-wide lookups
customerSchema.index({ business_id: 1 });

// Index for soft-delete filtering
customerSchema.index({ spreadsheet_id: 1, is_deleted: 1 });

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
