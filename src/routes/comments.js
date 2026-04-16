const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/commentController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// DELETE a comment (owner or post owner can delete)
router.delete('/:id',       requireAuth,  ctrl.deleteComment);

// Like / unlike a comment
router.post('/:id/like',    requireAuth,  ctrl.likeComment);
router.delete('/:id/like',  requireAuth,  ctrl.unlikeComment);

// Get threaded replies for a comment
router.get('/:id/replies',  optionalAuth, ctrl.getReplies);

module.exports = router;