const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// IMPORTANT FOR VERCEL
const UPLOAD_DIR = '/tmp/uploads';

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10');

// Create folders safely
['posts', 'stories', 'avatars', 'messages'].forEach((dir) => {
  const fullPath = path.join(UPLOAD_DIR, dir);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_MB * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {

    const ok = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
    ].includes(file.mimetype);

    cb(null, ok);
  },
});

const processImage = async (buffer, destDir, options = {}) => {

  const {
    maxWidth = 1080,
    maxHeight = 1350,
    quality = 85,
    format = 'webp',
  } = options;

  const filename = uuidv4() + '.' + format;

  const thumbName = 'thumb_' + filename;

  const imagePath = path.join(UPLOAD_DIR, destDir, filename);

  const thumbPath = path.join(UPLOAD_DIR, destDir, thumbName);

  await sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toFormat(format, { quality })
    .toFile(imagePath);

  await sharp(buffer)
    .resize(300, 300, {
      fit: 'cover',
    })
    .toFormat('webp', { quality: 70 })
    .toFile(thumbPath);

  return {
    url: imagePath,
    thumbnailUrl: thumbPath,
  };
};

const saveVideo = async (buffer, destDir, originalname) => {

  const ext = path.extname(originalname) || '.mp4';

  const filename = uuidv4() + ext;

  const videoPath = path.join(UPLOAD_DIR, destDir, filename);

  fs.writeFileSync(videoPath, buffer);

  return {
    url: videoPath,
    thumbnailUrl: null,
  };
};

module.exports = {
  upload,
  processImage,
  saveVideo,
};