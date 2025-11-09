const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Authentication middleware.
 * Verifies the JWT token from the 'x-auth-token' header.
 * If valid, attaches the user object (minus password) to req.user.
 * If invalid, returns a 401 Unauthorized error.
 */
module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user from token payload (id) and attach to req object
    // Exclude the password from the user object
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
        return res.status(401).json({ msg: 'User not found, authorization denied' });
    }

    // Call the next middleware or route handler
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};