const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getGfsBucket } = require('../server');

// GET /api/files/:id  - streams a GridFS file by id
router.get('/:id', async (req, res) => {
  try {
    const gfsBucket = getGfsBucket();
    if (!gfsBucket) return res.status(503).json({ msg: 'File storage not ready' });

    const fileId = req.params.id;
    if (!fileId) return res.status(400).json({ msg: 'File id required' });

    let objId;
    try {
      objId = new mongoose.Types.ObjectId(fileId);
    } catch (e) {
      return res.status(400).json({ msg: 'Invalid file id' });
    }

    const downloadStream = gfsBucket.openDownloadStream(objId);

    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err.message || err);
      res.status(404).json({ msg: 'File not found' });
    });

    downloadStream.on('file', (file) => {
      // set headers
      res.set('Content-Type', file.contentType || 'application/octet-stream');
      res.set('Content-Disposition', `inline; filename="${file.filename || fileId}"`);
    });

    downloadStream.pipe(res);
  } catch (err) {
    console.error('File route error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
