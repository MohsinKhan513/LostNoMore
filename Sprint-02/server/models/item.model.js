const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  itemType: {
    type: String,
    required: true,
    enum: ['lost', 'found'], // Value must be either 'lost' or 'found'
  },
  // Public URL for the uploaded image (Cloudinary) or local path
  imageUrl: {
    type: String,
    default: null,
  },
  // When using Cloudinary, store the public_id to allow deletions/management
  imagePublicId: {
    type: String,
    default: null,
  },
  // Contact information for the report (may be inferred from reporter or provided explicitly)
  contactName: {
    type: String,
  },
  contactEmail: {
    type: String,
  },
  contactMobile: {
    type: String,
  },
  // Status of the report: active (still missing/found) or recovered (returned)
  status: {
    type: String,
    enum: ['active', 'recovered'],
    default: 'active',
  },
  reportedBy: {
    type: Schema.Types.ObjectId, // Foreign key
    ref: 'User', // Links this field to the 'User' model
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Item', ItemSchema);