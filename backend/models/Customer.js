import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer_name: { type: String, required: true },
  company_name: { type: String, required: true },
  phone_number: { type: String, required: true },
  next_call_date: { type: String, required: true, default: () => new Date().toISOString().split('T')[0] }, // Keeping as string to match frontend format "yyyy-MM-dd"
  next_call_time: { type: String, default: '' }, // New field for time (e.g., "14:30")
  remark: { type: String, default: '' },
  position: { type: Number, default: 0 } // For drag and drop ordering
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

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