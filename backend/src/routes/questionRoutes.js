const express = require('express');
const {
  askQuestion,
  getQuestions,
  getQuestion,
  deleteQuestion,
  generateVideoForQuestion
} = require('../controllers/questionController');

const router = express.Router();

// Question routes - no authentication required
router.post('/', askQuestion);
router.get('/', getQuestions);
router.get('/:id', getQuestion);
router.get('/:id/status', getQuestion);
router.delete('/:id', deleteQuestion);
router.post('/:id/generate-video', generateVideoForQuestion);

module.exports = router;
