const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(requireAuth);

router.get('/',                   ctrl.getConversations);
router.post('/',                  ctrl.createConversation);
router.get('/:id/messages',       ctrl.getMessages);
router.post('/:id/messages',      ctrl.sendMessage);
router.post('/:id/messages/media',upload.single('media'), ctrl.sendMessage);
router.delete('/messages/:msgId', ctrl.deleteMessage);

module.exports = router;