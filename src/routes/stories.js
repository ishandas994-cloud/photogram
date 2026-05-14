const express = require('express');
const router  = express.Router();

const ctrl = require('../controllers/storyController');

const { requireAuth } = require('../middleware/auth');
const { uploadStory } = require('../middleware/upload');

// All story routes require auth
router.use(requireAuth);

// GET stories feed
router.get('/feed', ctrl.getStoryFeed);

// POST upload story
router.post(
  '/',
  uploadStory.single('media'),
  ctrl.createStory
);

// GET single story
router.get('/:id', ctrl.getStory);

// POST view story
router.post('/:id/view', ctrl.viewStory);

// GET viewers
router.get('/:id/viewers', ctrl.getViewers);

// POST reaction
router.post('/:id/react', ctrl.reactToStory);

// DELETE story
router.delete('/:id', ctrl.deleteStory);

// POST highlight
router.post('/highlights', ctrl.createHighlight);

module.exports = router;