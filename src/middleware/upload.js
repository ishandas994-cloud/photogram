const multer      = require('multer');
const cloudinary  = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for posts/reels
const postStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'photogram/posts',
    resource_type:  file.mimetype.startsWith('video') ? 'video' : 'image',
    allowed_formats: ['jpg','jpeg','png','webp','gif','mp4','webm'],
    transformation: file.mimetype.startsWith('video')
      ? [{ quality: 'auto' }]
      : [{ width: 1080, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  }),
});

// Storage for stories
const storyStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'photogram/stories',
    resource_type:  file.mimetype.startsWith('video') ? 'video' : 'image',
    allowed_formats: ['jpg','jpeg','png','webp','gif','mp4','webm'],
    transformation: [{ width: 1080, crop: 'limit', quality: 'auto' }],
  }),
});

// Storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'photogram/avatars',
    resource_type:  'image',
    allowed_formats: ['jpg','jpeg','png','webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
  },
});

// Storage for messages
const messageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:        'photogram/messages',
    resource_type: 'image',
    allowed_formats: ['jpg','jpeg','png','webp'],
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm',
  ];
  cb(null, allowed.includes(file.mimetype));
};

// Different upload instances for different routes
const upload = multer({
  storage: postStorage,
  limits:  { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
  fileFilter,
});

const uploadStory = multer({
  storage: storyStorage,
  limits:  { fileSize: 100 * 1024 * 1024 },
  fileFilter,
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

const uploadMessage = multer({
  storage: messageStorage,
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

// Helper to get URL + thumbnail from Cloudinary result
const getCloudinaryUrls = (file) => {
  if (!file) return { url: null, thumbnailUrl: null };
  const url = file.path || file.secure_url;
  // For videos, generate thumbnail
  const thumbnailUrl = file.resource_type === 'video' || file.mimetype?.startsWith('video')
    ? url.replace('/upload/', '/upload/so_0,w_400,h_400,c_fill,q_auto,f_jpg/')
         .replace('.mp4', '.jpg')
         .replace('.webm', '.jpg')
    : url.replace('/upload/', '/upload/w_300,h_300,c_fill,q_auto/');

  return { url, thumbnailUrl };
};

module.exports = {
  upload,
  uploadStory,
  uploadAvatar,
  uploadMessage,
  getCloudinaryUrls,
  cloudinary,
  // Keep these for backward compatibility
  processImage: async () => {},
  saveVideo:    async () => {},
};