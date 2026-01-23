import mongoose from 'mongoose';

const spreadsheetSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  business_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  assigned_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  name: { type: String, required: true },
  description: { type: String, default: '' },
  page_name: { type: String, default: '' },
  form_name: { type: String, default: '' },
  campaign_name: { type: String, default: '' },
  ad_set_name: { type: String, default: '' },
  ad_name: { type: String, default: '' },
  meta_headers: { type: [String], default: [] },
  is_meta: { type: Boolean, default: false },
  is_master: { type: Boolean, default: false },
  is_unified: { type: Boolean, default: false }, // New: Unified Lead Sheet (Smart List)
  linked_meta_sheets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Spreadsheet' }], // New: List of Meta Sheets this sheet subscribes to
  linked_google_sheet_url: { type: String, default: '' },
  linked_sheet_name: { type: String, default: '' },
  column_mapping: { type: Object, default: null },
  realtime_sync: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Map _id to id
spreadsheetSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

export default mongoose.model('Spreadsheet', spreadsheetSchema);