const multer = require('multer');

// Memory storage: keeps file in memory (buffer) so routes can upload to Cloudinary or stream to GridFS
const storage = multer.memoryStorage();

module.exports = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6 MB limit
});
