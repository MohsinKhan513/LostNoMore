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
      .populate('reportedBy', 'name email phone whatsapp'); // Join with User, select contact info

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
      .populate('reportedBy', 'name email phone whatsapp'); // Get reporter's contact info

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

// --- (US-11, US-17) Update an item ---
// @route   PUT /api/items/:id
// This route is protected - only the creator can edit
router.put('/:id', [auth, upload.single('itemImage')], async (req, res) => {
  try {
    const { title, description, category, location, itemType } = req.body;
    
    // Find the item first
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    
    // Check if the user is the owner
    if (item.reportedBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to edit this item' });
    }
    
    // Build update object with only provided fields
    const updateData = { updatedAt: Date.now() };
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (location) updateData.location = location;
    if (itemType) updateData.itemType = itemType;
    
    // If a new image was uploaded, update imageUrl
    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }
    
    // Update the item
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    
    res.json(updatedItem);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server Error');
  }
});

// --- (US-12) Mark item as recovered/returned (US-18) ---
// @route   PATCH /api/items/:id/status
// This route is protected - only the creator can update status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (!status || !['active', 'recovered', 'returned'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status. Must be active, recovered, or returned' });
    }
    
    // Find the item first
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    
    // Check if the user is the owner
    if (item.reportedBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to update this item' });
    }
    
    // Update status
    item.status = status;
    item.updatedAt = Date.now();
    await item.save();
    
    res.json(item);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server Error');
  }
});

// --- (US-13, US-18) Delete an item ---
// @route   DELETE /api/items/:id
// This route is protected - only the creator can delete
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find the item first
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    
    // Check if the user is the owner
    if (item.reportedBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this item' });
    }
    
    // Delete the item
    await Item.findByIdAndDelete(req.params.id);
    
    res.json({ msg: 'Item deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server Error');
  }
});

// --- (US-19, US-20, US-21, US-22, US-23) Search and filter items ---
// @route   GET /api/items/search
// This route supports multiple query parameters for filtering
router.get('/search/advanced', async (req, res) => {
  try {
    const { 
      keyword,        // US-19: Search by item name/description
      category,       // US-20: Filter by category
      location,       // US-21: Filter by location
      itemType,       // Filter by lost/found
      status,         // Filter by status
      dateFrom,       // US-22: Date range - start
      dateTo,         // US-22: Date range - end
      sortBy = 'createdAt',  // US-23: Sort field
      sortOrder = 'desc'     // US-23: Sort order
    } = req.query;
    
    // Build query object
    const query = {};
    
    // Keyword search (US-19)
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    
    // Category filter (US-20)
    if (category) {
      query.category = category;
    }
    
    // Location filter (US-21)
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    // Item type filter
    if (itemType) {
      query.itemType = itemType;
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    // Date range filter (US-22)
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Add one day to include the entire end date
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query.createdAt.$lt = endDate;
      }
    }
    
    // Build sort object (US-23)
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query
    const items = await Item.find(query)
      .sort(sort)
      .populate('reportedBy', 'name email phone whatsapp');
    
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;