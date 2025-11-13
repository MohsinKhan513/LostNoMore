// server/server.js

// ✅ Load .env variables (looks for .env in the project root automatically)
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/item.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected successfully.'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// GridFS removed: using Cloudinary for file storage

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Static File Serving ---
app.use(express.static(path.join(__dirname, '..', 'client')));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

// --- SPA "Catch-all" Route ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Export helper to access GridFSBucket from routes
module.exports.getGfsBucket = () => app.locals.gfsBucket;