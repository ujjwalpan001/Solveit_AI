const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');

// Conversation routes - no authentication required
router.post('/', conversationController.createConversation);
router.get('/', conversationController.getConversations);
router.get('/:id', conversationController.getConversation);
router.put('/:id', conversationController.updateConversation);
router.delete('/:id', conversationController.deleteConversation);

module.exports = router;
