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
  imageUrl: {
    type: String, // Will store the path to the uploaded image, e.g., /uploads/image.png
  },
  reportedBy: {
    type: Schema.Types.ObjectId, // Foreign key
    ref: 'User', // Links this field to the 'User' model
    required: true,
  },
  // ======================================================
  // NEW: Status field for tracking item recovery/return (US-12, US-18)
  // ======================================================
  status: {
    type: String,
    enum: ['active', 'recovered', 'returned'],
    default: 'active',
  },
  // ======================================================
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Item', ItemSchema);