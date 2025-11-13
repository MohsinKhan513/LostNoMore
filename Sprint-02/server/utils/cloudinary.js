const cloudinary = require('cloudinary').v2;

// Configure Cloudinary using environment variables (no-throw on missing vars)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
});

// Safe upload helper that returns a clear error if credentials are missing
cloudinary.safeUpload = async (dataUri, options = {}) => {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary credentials are not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
  }
  return await cloudinary.uploader.upload(dataUri, options);
};

cloudinary.safeDestroy = async (publicId, options = {}) => {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary credentials are not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
  }
  return await cloudinary.uploader.destroy(publicId, options);
};

module.exports = cloudinary;
