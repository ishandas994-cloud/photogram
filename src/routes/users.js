const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/userController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/search',               optionalAuth, ctrl.searchUsers);
router.get('/me',                   requireAuth,  (req,res) => res.json(req.user));
router.put('/me',                   requireAuth,  upload.single('avatar'), ctrl.updateProfile);

router.get('/:username',            optionalAuth, ctrl.getProfile);
router.get('/:username/followers',  optionalAuth, ctrl.getFollowers);
router.get('/:username/following',  optionalAuth, ctrl.getFollowing);
router.post('/:username/follow',    requireAuth,  ctrl.follow);
router.delete('/:username/follow',  requireAuth,  ctrl.unfollow);
router.post('/:username/follow/accept',   requireAuth, ctrl.acceptFollow);
router.delete('/:username/follow/decline', requireAuth, ctrl.declineFollow);
router.post('/:username/block',     requireAuth,  ctrl.blockUser);
router.post('/:username/follow/accept',    requireAuth, ctrl.acceptFollow);
router.delete('/:username/follow/decline', requireAuth, ctrl.declineFollow);
module.exports = router;