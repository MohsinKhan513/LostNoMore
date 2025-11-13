const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

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

    // 3. Check for university email domain (allowing both)
    const allowedDomains = ['@nu.edu.pk', '@isb.nu.edu.pk'];
    if (!allowedDomains.some(domain => email.endsWith(domain))) {
      return res.status(400).json({ msg: 'Please use a valid university email (@nu.edu.pk or @isb.nu.edu.pk)' });
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
        profilePicture: user.profilePicture
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
            whatsapp: user.whatsapp,
            profilePicture: user.profilePicture
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
      whatsapp: user.whatsapp,
      profilePicture: user.profilePicture,
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
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, whatsapp, profilePicture } = req.body;

    // Prepare update object
    const updateData = {};

    // Validate and update phone if provided
    if (phone) {
      const e164Regex = /^\+[1-9]\d{7,14}$/;
      if (!e164Regex.test(phone.trim())) {
        return res.status(400).json({ msg: 'Phone number must be in E.164 format (e.g., +923001234567)' });
      }
      updateData.phone = phone;
    }

    // Validate and update WhatsApp if provided (US-06)
    if (whatsapp !== undefined) {
      if (whatsapp && whatsapp.trim()) {
        const e164Regex = /^\+[1-9]\d{7,14}$/;
        if (!e164Regex.test(whatsapp.trim())) {
          return res.status(400).json({ msg: 'WhatsApp number must be in E.164 format (e.g., +923001234567)' });
        }
        updateData.whatsapp = whatsapp;
      } else {
        // Allow clearing WhatsApp
        updateData.whatsapp = null;
      }
    }

    // Update profile picture if provided
    if (profilePicture !== undefined) {
      updateData.profilePicture = profilePicture;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ msg: 'No fields to update' });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true } // Return updated document
    ).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({ 
      msg: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ msg: 'Server error while updating profile' });
  }
});

// ======================================================
// NEW: Password reset (US-07)
// @route   POST /api/auth/reset-password
// @access  Private (requires authentication)
// Note: In a production environment, this would typically use email verification
// For this implementation, we'll allow users to reset their password while logged in
// ======================================================
router.post('/reset-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ msg: 'New password must be at least 6 characters long' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error('Password reset error:', err.message);
    res.status(500).json({ msg: 'Server error while resetting password' });
  }
});
// ======================================================

module.exports = router;