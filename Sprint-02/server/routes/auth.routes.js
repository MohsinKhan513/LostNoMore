const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');
const mongoose = require('mongoose');
const upload = require('../utils/multer-memory');
const cloudinary = require('../utils/cloudinary');
const crypto = require('crypto');
const User = require('../models/user.model');

// Using memory multer; files will be uploaded to Cloudinary
const profileUpload = upload;

// ======================================================
// NEW: Middleware to authenticate token
// ======================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  // Also check x-auth-token header as fallback
  const tokenAlt = req.headers['x-auth-token'];
  const finalToken = token || tokenAlt;

  if (!finalToken) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(finalToken, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
// ======================================================

// --- (US-01, US-03) Register a new user ---
// @route   POST /api/auth/register
// MODIFIED: Now includes phone number
router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    // 1. Validate input
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ msg: 'Please enter all fields including phone number' });
    }

    // 2. Validate phone number format (E.164)
    const e164Regex = /^\+[1-9]\d{7,14}$/;
    if (!e164Regex.test(phone.trim())) {
      return res.status(400).json({ msg: 'Phone number must be in E.164 format (e.g., +923001234567)' });
    }

    // 3. Check for university email domain. Domains can be configured via ENV variable
    // Example: UNIVERSITY_DOMAINS=nu.edu.pk,isb.nu.edu.pk
    const domainsEnv = process.env.UNIVERSITY_DOMAINS || 'nu.edu.pk,isb.nu.edu.pk';
    const allowedDomains = domainsEnv.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
    const emailLower = email.toLowerCase();
    const domainMatched = allowedDomains.some(d => emailLower.endsWith(`@${d}`));
    if (!domainMatched) {
      return res.status(400).json({ msg: `Please use a valid university email (one of: ${allowedDomains.join(', ')})` });
    }

    // 4. Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // 5. Create new user instance with phone number
    user = new User({
      name,
      email,
      password,
      phone, // Add phone number
    });

    // 6. Save user (password will be hashed by pre-save hook)
    await user.save();
    
    res.status(201).json({ 
      msg: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture || null
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error during registration' });
  }
});

// --- (US-02, US-04) Login a user ---
// @route   POST /api/auth/login
// MODIFIED: Now returns user object along with token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // 2. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 3. Compare submitted password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 4. Create JWT payload
    const payload = {
      id: user.id
    };

    // 5. Sign the token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' }, // Token expires in 5 hours
      (err, token) => {
        if (err) throw err;
        
        // 6. Return the token AND user object to the client
        res.json({ 
          token,
          user: {
              id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              profilePicture: user.profilePicture || null
            }
        });
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error during login' });
  }
});

// ======================================================
// NEW: Get user profile
// @route   GET /api/auth/profile
// @access  Private (requires authentication)
// ======================================================
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePicture: user.profilePicture || null,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('Profile fetch error:', err.message);
    res.status(500).json({ msg: 'Server error while fetching profile' });
  }
});

// ======================================================
// NEW: Update user profile
// @route   PUT /api/auth/profile
// @access  Private (requires authentication)
// Allows updating phone number and profile picture
// ======================================================
router.put('/profile', [authenticateToken, profileUpload.single('profilePicture')], async (req, res) => {
  try {
    const userId = req.user.id;

    // Accept either multipart/form-data (for picture) or JSON body
    const phone = req.body.phone;
    const whatsapp = req.body.whatsapp;

    const updateData = {};
    if (phone) {
      const e164Regex = /^\+[1-9]\d{7,14}$/;
      if (!e164Regex.test(phone.trim())) {
        return res.status(400).json({ msg: 'Phone number must be in E.164 format (e.g., +923001234567)' });
      }
      updateData.phone = phone;
    }

    if (whatsapp) {
      const e164Regex = /^\+[1-9]\d{7,14}$/;
      if (!e164Regex.test(whatsapp.trim())) {
        return res.status(400).json({ msg: 'WhatsApp number must be in E.164 format (e.g., +923001234567)' });
      }
      updateData.whatsapp = whatsapp;
    }

    if (req.file) {
      // Upload to Cloudinary and delete previous Cloudinary asset if present
      const userObj = await User.findById(userId);
      if (userObj && userObj.cloudinary_public_id) {
        try { await cloudinary.safeDestroy(userObj.cloudinary_public_id, { resource_type: 'image' }); } catch (e) { /* ignore */ }
      }

      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploaded = await cloudinary.safeUpload(dataUri, {
        folder: `user-profiles/${userId}`,
        public_id: `profile_${Date.now()}`,
        resource_type: 'image',
        transformation: [{ width: 1200, crop: 'limit' }],
      });

      updateData.profilePicture = uploaded.secure_url;
      updateData.cloudinary_public_id = uploaded.public_id;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ msg: 'No fields to update' });
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    res.json({ msg: 'Profile updated successfully', user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePicture: user.profilePicture || null,
      createdAt: user.createdAt
    }});
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ msg: 'Server error while updating profile' });
  }
});

// ======================================================

module.exports = router;

// ======================================================
// Password reset endpoints
// POST /api/auth/forgot-password  { email }
// POST /api/auth/reset-password   { token, newPassword }
// ======================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json({ msg: 'If an account exists, a reset link was sent' });

    // generate token
    const token = crypto.randomBytes(20).toString('hex');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // In production you would email a link containing the token. For development, return token in response.
    // Example reset URL: https://yourapp/reset-password?token=<token>&email=<email>
    res.json({ msg: 'Password reset token created', token });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ msg: 'Token and new password required' });

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashed, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ msg: 'Invalid or expired token' });

    if (newPassword.length < 6) return res.status(400).json({ msg: 'New password must be at least 6 characters' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ msg: 'Password has been reset' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ======================================================
// NEW: Change password endpoint
// @route POST /api/auth/change-password
// @access Private
// Body: { currentPassword, newPassword }
// ======================================================
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'Provide current and new password' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Compare current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Current password is incorrect' });

    // Validate new password strength (basic)
    if (newPassword.length < 6) return res.status(400).json({ msg: 'New password must be at least 6 characters' });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ msg: 'Server error while changing password' });
  }
});