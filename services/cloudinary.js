const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_URL.split('@')[1],
  api_key: process.env.CLOUDINARY_URL.split('//')[1].split(':')[0],
  api_secret: process.env.CLOUDINARY_URL.split(':')[2].split('@')[0]
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'visitor-map-profiles',
    format: async (req, file) => 'png', // supports promises as well
    public_id: (req, file) => `profile-${req.params.uniqueId}-${Date.now()}`,
  },
});

module.exports = { cloudinary, storage };
