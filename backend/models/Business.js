import mongoose from 'mongoose';

const BusinessSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    phone: String,
    address: String,
    logo: String, // Base64 string
    settings: {
        metaPageAccessToken: { type: String, default: '' },
        metaVerifyToken: { type: String, default: '' },
        metaPageId: { type: String, default: '' },
        metaPages: [{
            pageId: { type: String, required: true },
            pageAccessToken: { type: String, required: true },
            pageName: { type: String, default: '' }
        }]
    }
}, { timestamps: true });

// Map _id to id
BusinessSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
});

export default mongoose.model('Business', BusinessSchema);
