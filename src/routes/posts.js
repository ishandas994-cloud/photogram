const express     = require('express');
const router      = express.Router();
const postCtrl    = require('../controllers/postController');
const commentCtrl = require('../controllers/commentController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/feed',          requireAuth,  postCtrl.getFeed);
router.get('/explore',       optionalAuth, postCtrl.explore);
router.get('/hashtag/:tag',  optionalAuth, postCtrl.getByHashtag);

// ← THESE MUST BE BEFORE /:id
router.get('/saved',         requireAuth,  postCtrl.getSavedPosts);
router.get('/liked',         requireAuth,  postCtrl.getLikedPosts);

router.post('/',             requireAuth,  upload.array('media', 10), postCtrl.createPost);
router.get('/:id',           optionalAuth, postCtrl.getPost);
router.delete('/:id',        requireAuth,  postCtrl.deletePost);

router.post('/:id/like',     requireAuth,  postCtrl.likePost);
router.delete('/:id/like',   requireAuth,  postCtrl.unlikePost);
router.post('/:id/save',     requireAuth,  postCtrl.savePost);
router.delete('/:id/save',   requireAuth,  postCtrl.unsavePost);

router.get('/:id/comments',  optionalAuth, commentCtrl.getComments);
router.post('/:id/comments', requireAuth,  commentCtrl.addComment);

module.exports = router;