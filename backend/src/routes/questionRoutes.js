const express = require('express');
const {
  askQuestion,
  getQuestions,
  getQuestion,
  deleteQuestion,
  generateVideoForQuestion
} = require('../controllers/questionController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All question routes require authentication
router.use(authMiddleware);

router.post('/', askQuestion);
router.get('/', getQuestions);
router.get('/:id', getQuestion);
router.delete('/:id', deleteQuestion);
router.post('/:id/generate-video', generateVideoForQuestion);

module.exports = router;
