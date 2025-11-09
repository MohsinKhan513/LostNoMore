const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth.middleware'); // Import auth middleware
const Item = require('../models/item.model');

// --- Multer Configuration for Image Uploads ---
const storage = multer.diskStorage({
  // Set destination folder
  // __dirname is 'LNF/server/routes'
  // ../.. is 'LNF/'
  // 'uploads' is 'LNF/uploads'
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  // Set filename to be unique to avoid conflicts
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Initialize multer with the storage config
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Basic image file type check
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// --- (US-08, 09, 14, 15) Report a new item (Lost or Found) ---
// @route   POST /api/items/report
// This route is protected by 'auth' middleware AND uses 'upload' middleware
router.post('/report', [auth, upload.single('itemImage')], async (req, res) => {
  const { title, description, category, location, itemType } = req.body;
  
  // Check if file was uploaded
  // req.file.path will be like 'LNF/uploads/image-12345.png'
  // We want to store the URL path, not the filesystem path
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    // Create new item object
    const newItem = new Item({
      title,
      description,
      category,
      location,
      itemType,
      imageUrl,
      reportedBy: req.user.id // Get user ID from the auth middleware
    });

    // Save item to database
    const item = await newItem.save();
    res.status(201).json(item); // Return the newly created item

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- Get all items (for main dashboard) ---
// @route   GET /api/items/all
// This route is public (no 'auth' middleware)
router.get('/all', async (req, res) => {
  try {
    const items = await Item.find()
      .sort({ createdAt: -1 }) // Newest first
      .populate('reportedBy', 'name email'); // Join with User, select only name and email

    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- (US-10, US-16) Get user's own reported items ---
// @route   GET /api/items/my-reports
// This route is protected
router.get('/my-reports', auth, async (req, res) => {
  try {
    // Find items where 'reportedBy' matches the logged-in user's ID
    const items = await Item.find({ reportedBy: req.user.id })
      .sort({ createdAt: -1 }); // Newest first

    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- (US-24) Get a single item by its ID ---
// @route   GET /api/items/:id
// This route is public
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('reportedBy', 'name email'); // Get reporter's info

    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }

    res.json(item);
  } catch (err) {
    console.error(err.message);
    // Handle invalid ObjectId format
    if (err.kind === 'ObjectId') {
         return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;