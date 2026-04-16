const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/storyController');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// All story routes require auth
router.use(requireAuth);

router.get('/feed',               ctrl.getStoryFeed);           // GET  stories of followed users
router.post('/',   upload.single('media'), ctrl.createStory);   // POST upload a new story

router.get('/:id',                ctrl.getStory);               // GET  single story
router.post('/:id/view',          ctrl.viewStory);              // POST mark as viewed
router.get('/:id/viewers',        ctrl.getViewers);             // GET  who viewed (owner only)
router.post('/:id/react',         ctrl.reactToStory);           // POST emoji reaction
router.delete('/:id',             ctrl.deleteStory);            // DELETE own story

// Highlights
router.post('/highlights',        ctrl.createHighlight);        // POST create highlight album

module.exports = router;