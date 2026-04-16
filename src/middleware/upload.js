
const multer = require('multer');
const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_MB     = parseInt(process.env.MAX_FILE_SIZE_MB || '10');

['posts','stories','avatars','messages'].forEach(dir =>
  fs.mkdirSync(path.join(UPLOAD_DIR, dir), { recursive: true })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp','image/gif',
                 'video/mp4','video/webm'].includes(file.mimetype);
    cb(null, ok);
  },
});

const processImage = async (buffer, destDir, options = {}) => {
  const { maxWidth=1080, maxHeight=1350, quality=85, format='webp' } = options;
  const filename  = uuidv4() + '.' + format;
  const thumbName = 'thumb_' + filename;

  await sharp(buffer)
    .resize(maxWidth, maxHeight, { fit:'inside', withoutEnlargement:true })
    .toFormat(format, { quality })
    .toFile(path.join(UPLOAD_DIR, destDir, filename));

  await sharp(buffer)
    .resize(300, 300, { fit:'cover' })
    .toFormat('webp', { quality: 70 })
    .toFile(path.join(UPLOAD_DIR, destDir, thumbName));

  return {
    url:          '/' + UPLOAD_DIR + '/' + destDir + '/' + filename,
    thumbnailUrl: '/' + UPLOAD_DIR + '/' + destDir + '/' + thumbName,
  };
};

const saveVideo = async (buffer, destDir, originalname) => {
  const ext      = path.extname(originalname) || '.mp4';
  const filename = uuidv4() + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, destDir, filename), buffer);
  return { url: '/' + UPLOAD_DIR + '/' + destDir + '/' + filename, thumbnailUrl: null };
};

module.exports = { upload, processImage, saveVideo };