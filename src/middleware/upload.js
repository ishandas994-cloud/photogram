const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// =========================
// Cloudinary Config
// =========================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =========================
// File Filter
// =========================
const fileFilter = (_req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime', // MOV support
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

// =========================
// POSTS / REELS STORAGE
// =========================
const postStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const isVideo = file.mimetype.startsWith('video');

    return {
      folder: 'photogram/posts',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'mp4',
        'webm',
        'mov',
      ],
      transformation: isVideo
        ? [{ quality: 'auto' }]
        : [
            {
              width: 1080,
              crop: 'limit',
              quality: 'auto',
              fetch_format: 'auto',
            },
          ],
    };
  },
});

// =========================
// STORIES STORAGE
// FIXED FOR VIDEO STORIES
// =========================
const storyStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const isVideo = file.mimetype.startsWith('video');

    return {
      folder: 'photogram/stories',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'mp4',
        'webm',
        'mov',
      ],

      transformation: isVideo
        ? [{ quality: 'auto' }]
        : [
            {
              width: 1080,
              crop: 'limit',
              quality: 'auto',
              fetch_format: 'auto',
            },
          ],
    };
  },
});

// =========================
// AVATAR STORAGE
// =========================
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'photogram/avatars',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      {
        width: 400,
        height: 400,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto',
      },
    ],
  }),
});

// =========================
// MESSAGE MEDIA STORAGE
// FIXED FOR VIDEO SUPPORT
// =========================
const messageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const isVideo = file.mimetype.startsWith('video');

    return {
      folder: 'photogram/messages',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'mp4',
        'webm',
        'mov',
      ],

      transformation: isVideo
        ? [{ quality: 'auto' }]
        : [
            {
              width: 1200,
              crop: 'limit',
              quality: 'auto',
              fetch_format: 'auto',
            },
          ],
    };
  },
});

// =========================
// Upload Instances
// =========================
const upload = multer({
  storage: postStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter,
});

const uploadStory = multer({
  storage: storyStorage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter,
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

const uploadMessage = multer({
  storage: messageStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter,
});

// =========================
// Helper Function
// =========================
const getCloudinaryUrls = (file) => {
  if (!file) {
    return {
      url: null,
      thumbnailUrl: null,
    };
  }

  const url = file.path || file.secure_url;

  let thumbnailUrl;

  const isVideo =
    file.resource_type === 'video' ||
    file.mimetype?.startsWith('video');

  if (isVideo) {
    thumbnailUrl = url
      .replace(
        '/upload/',
        '/upload/so_0,w_400,h_400,c_fill,q_auto,f_jpg/'
      )
      .replace('.mp4', '.jpg')
      .replace('.webm', '.jpg')
      .replace('.mov', '.jpg');
  } else {
    thumbnailUrl = url.replace(
      '/upload/',
      '/upload/w_300,h_300,c_fill,q_auto/'
    );
  }

  return {
    url,
    thumbnailUrl,
  };
};

// =========================
// Exports
// =========================
module.exports = {
  upload,
  uploadStory,
  uploadAvatar,
  uploadMessage,
  getCloudinaryUrls,
  cloudinary,

  // backward compatibility
  processImage: async () => {},
  saveVideo: async () => {},
};