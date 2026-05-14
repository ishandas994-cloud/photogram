const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/storyController');
const { requireAuth } = require('../middleware/auth');
const { uploadStory } = require('../middleware/upload');

// =========================
// All routes require auth
// =========================
router.use(requireAuth);

// =========================
// Story Feed
// =========================
router.get('/feed', ctrl.getStoryFeed);

// =========================
// Upload Story
// IMPORTANT:
// use uploadStory not upload
// =========================
router.post(
  '/',
  uploadStory.single('media'),
  ctrl.createStory
);

// =========================
// Single Story
// =========================
router.get('/:id', ctrl.getStory);

// =========================
// Views
// =========================
router.post('/:id/view', ctrl.viewStory);

router.get('/:id/viewers', ctrl.getViewers);

// =========================
// Reactions
// =========================
router.post('/:id/react', ctrl.reactToStory);

// =========================
// Delete Story
// =========================
router.delete('/:id', ctrl.deleteStory);

// =========================
// Highlights
// =========================
router.post('/highlights', ctrl.createHighlight);

module.exports = router;