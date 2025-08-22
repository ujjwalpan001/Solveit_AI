const express = require('express');
const { getDashboardStats, searchQuestions } = require('../controllers/userController');

const router = express.Router();

// User routes - no authentication required
router.get('/dashboard/stats', getDashboardStats);
router.get('/search', searchQuestions);

module.exports = router;
