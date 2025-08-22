const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const conversationController = require('../controllers/conversationController');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Conversation routes
router.post('/', conversationController.createConversation);
router.get('/', conversationController.getConversations);
router.get('/:id', conversationController.getConversation);
router.put('/:id', conversationController.updateConversation);
router.delete('/:id', conversationController.deleteConversation);

module.exports = router;
