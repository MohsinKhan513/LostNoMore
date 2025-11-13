const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');
const mongoose = require('mongoose');
const upload = require('../utils/multer-memory');
const cloudinary = require('../utils/cloudinary');
const auth = require('../middleware/auth.middleware'); // Import auth middleware
const Item = require('../models/item.model');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Using memory multer; files will be streamed into GridFS

// --- (US-08, 09, 14, 15) Report a new item (Lost or Found) ---
// @route   POST /api/items/report
// This route is protected by 'auth' middleware AND uses 'upload' middleware
router.post('/report', [auth, upload.single('itemImage')], async (req, res) => {
  const { title, description, category, location, itemType } = req.body;
  // If file uploaded, upload to Cloudinary and capture URL/public_id
  let imageUrl = null;
  let imagePublicId = null;
    if (req.file) {
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const uploaded = await cloudinary.safeUpload(dataUri, {
      folder: `item-images/${req.user.id}`,
      public_id: `item_${Date.now()}`,
      resource_type: 'image',
      transformation: [{ width: 1200, crop: 'limit' }],
    });
    imageUrl = uploaded.secure_url;
    imagePublicId = uploaded.public_id;
  }

  // Accept optional contact fields coming from client (auto-filled with user's data)
  const { contactName, contactEmail, contactMobile } = req.body;

  try {
    // Create new item object
    const newItem = new Item({
      title,
      description,
      category,
      location,
      itemType,
      imageUrl,
      imagePublicId,
      reportedBy: req.user.id, // Get user ID from the auth middleware
      contactName: contactName || undefined,
      contactEmail: contactEmail || undefined,
      contactMobile: contactMobile || undefined,
    });

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
      .populate('reportedBy', 'name email phone'); // Join with User, select name,email,phone
    // items already store imageUrl when using Cloudinary
    const mapped = items.map(i => i.toObject());
    res.json(mapped);
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
      .sort({ createdAt: -1 })
      .populate('reportedBy', 'name email phone'); // include contact info
    const mapped = items.map(i => i.toObject());
    res.json(mapped);
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
      .populate('reportedBy', 'name email phone'); // Get reporter's info

    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }

    const obj = item.toObject();
    res.json(obj);
  } catch (err) {
    console.error(err.message);
    // Handle invalid ObjectId format
    if (err.kind === 'ObjectId') {
         return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server Error');
  }
});

// --- (US-11, US-13, US-12) Update an item (edit details)
// @route   PUT /api/items/:id
// Protected route; supports updating image via multipart
router.put('/:id', [auth, upload.single('itemImage')], async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });

    // Only the user who reported the item can edit/delete
    if (item.reportedBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ msg: 'Not authorized to edit this item' });
    }

    const { title, description, category, location, itemType, contactName, contactEmail, contactMobile } = req.body;

    // If there's a new image uploaded, upload to Cloudinary and remove old asset
    if (req.file) {
      if (item.imagePublicId) {
        try { await cloudinary.safeDestroy(item.imagePublicId, { resource_type: 'image' }); } catch (e) { /* ignore */ }
      }
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploaded = await cloudinary.safeUpload(dataUri, {
        folder: `item-images/${req.user.id}`,
        public_id: `item_${Date.now()}`,
        resource_type: 'image',
        transformation: [{ width: 1200, crop: 'limit' }],
      });
      item.imageUrl = uploaded.secure_url;
      item.imagePublicId = uploaded.public_id;
    }

    // Update fields if provided
    if (title) item.title = title;
    if (description) item.description = description;
    if (category) item.category = category;
    if (location) item.location = location;
    if (itemType) item.itemType = itemType;
    if (contactName !== undefined) item.contactName = contactName;
    if (contactEmail !== undefined) item.contactEmail = contactEmail;
    if (contactMobile !== undefined) item.contactMobile = contactMobile;

    const updated = await item.save();
    const obj = updated.toObject();
    res.json(obj);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- Delete an item ---
// @route DELETE /api/items/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.reportedBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ msg: 'Not authorized to delete this item' });
    }
    // remove Cloudinary asset if exists
    if (item.imagePublicId) {
      try { await cloudinary.uploader.destroy(item.imagePublicId, { resource_type: 'image' }); } catch (e) { /* ignore */ }
    }
    await item.remove();
    res.json({ msg: 'Item deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- Update status (mark as recovered) ---
// @route PUT /api/items/:id/status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.reportedBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ msg: 'Not authorized to change status' });
    }
    const { status } = req.body;
    if (!['active', 'recovered'].includes(status)) return res.status(400).json({ msg: 'Invalid status' });
    item.status = status;
    await item.save();
    const obj = item.toObject();
    res.json({ msg: 'Status updated', item: obj });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- Search / filter / sort endpoint ---
// @route GET /api/items
// Query params: q, category, location, startDate, endDate, itemType, sort (date_asc/date_desc)
router.get('/', async (req, res) => {
  try {
    const { q, category, location, startDate, endDate, itemType, sort } = req.query;
    const filter = {};
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (category) filter.category = category;
    if (location) filter.location = location;
    if (itemType) filter.itemType = itemType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    let query = Item.find(filter).populate('reportedBy', 'name email phone');

    if (sort === 'date_asc') query = query.sort({ createdAt: 1 });
    else query = query.sort({ createdAt: -1 });

    const items = await query.exec();
    const mapped = items.map(i => i.toObject());
    res.json(mapped);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;