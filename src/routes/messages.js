const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(requireAuth);

// Conversations
router.get('/',                     ctrl.getConversations);    // GET  all conversations for current user
router.post('/',                    ctrl.createConversation);  // POST start new 1-to-1 or group chat

// Messages inside a conversation
router.get('/:id/messages',         ctrl.getMessages);         // GET  paginated messages
router.post('/:id/messages',
  upload.single('media'),           ctrl.sendMessage);         // POST send text/media message

// Delete a single message
router.delete('/messages/:msgId',   ctrl.deleteMessage);       // DELETE (soft) own message

module.exports = router;