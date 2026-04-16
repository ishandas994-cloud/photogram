const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/',            ctrl.getNotifications);  // GET  paginated notifications + unread count
router.post('/read-all',   ctrl.markAllRead);       // POST mark every unread notification as read
router.post('/:id/read',   ctrl.markRead);          // POST mark single notification as read

module.exports = router;