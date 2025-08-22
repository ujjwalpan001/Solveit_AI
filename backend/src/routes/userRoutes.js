const express = require('express');
const { getDashboardStats, searchQuestions } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

router.get('/dashboard/stats', getDashboardStats);
router.get('/search', searchQuestions);

module.exports = router;
