import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String }, // Display name (non-unique)
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  business_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  role: { type: String, enum: ['admin', 'user'], default: 'admin' },
  permissions: {
    type: [String],
    default: ['dashboard', 'poster'] // Default permissions (webhooks off)
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  plain_password: { type: String, select: false }, // Hidden by default, explicitly selected for Admin
}, { timestamps: true });

// Index for business lookups
userSchema.index({ business_id: 1 });

// Map _id to id
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password; // Do not return password
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
  }
});

export default mongoose.model('User', userSchema);