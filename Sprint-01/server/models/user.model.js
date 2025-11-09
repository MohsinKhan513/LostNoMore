const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // Store emails in lowercase
  },
  password: {
    type: String,
    required: true,
  },
  // ======================================================
  // NEW: Phone number field (required during registration)
  // ======================================================
  phone: {
    type: String,
    required: true,
  },
  // ======================================================

  // ======================================================
  // NEW: Profile picture field (optional, for future use)
  // ======================================================
  profilePicture: {
    type: String,
    default: null,
  },
  // ======================================================

  // ======================================================
  // NEW: Timestamp fields
  // ======================================================
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // ======================================================
});

// Pre-save hook to hash password before saving
// This function will run before a 'save' command is executed
UserSchema.pre('save', async function (next) {
  // 'this' refers to the user document being saved

  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    // Update the updatedAt timestamp on every save
    this.updatedAt = Date.now();
    return next();
  }

  try {
    // Generate a salt (10 rounds is standard)
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error); // Pass error to the next middleware
  }
});

module.exports = mongoose.model('User', UserSchema);