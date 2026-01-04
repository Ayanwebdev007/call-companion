import mongoose from 'mongoose';

const spreadsheetSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  page_name: { type: String, default: '' },
  form_name: { type: String, default: '' },
  campaign_name: { type: String, default: '' },
  meta_headers: { type: [String], default: [] },
  is_meta: { type: Boolean, default: false },
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