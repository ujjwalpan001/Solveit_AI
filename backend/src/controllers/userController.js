const User = require('../models/User');
const Question = require('../models/Question');

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get total questions count
    const totalQuestions = await Question.countDocuments({ userId });

    // Get questions by subject
    const questionsBySubject = await Question.aggregate([
      { $match: { userId } },
      { $group: { _id: '$subject', count: { $sum: 1 } } }
    ]);

    // Get recent questions (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentQuestions = await Question.countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get video generation stats
    const videoStats = await Question.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalWithVideos: {
            $sum: { $cond: [{ $ne: ['$videoPath', null] }, 1, 0] }
          },
          processing: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = videoStats[0] || { totalWithVideos: 0, processing: 0, failed: 0 };

    res.json({
      success: true,
      data: {
        totalQuestions,
        recentQuestions,
        questionsBySubject: questionsBySubject.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        videoStats: stats
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message
    });
  }
};

const searchQuestions = async (req, res) => {
  try {
    const { query, subject, startDate, endDate, page = 1, limit = 10 } = req.query;

    const searchCriteria = { userId: req.user._id };

    if (query) {
      searchCriteria.$or = [
        { question: { $regex: query, $options: 'i' } },
        { 'answer.text': { $regex: query, $options: 'i' } }
      ];
    }

    if (subject && subject !== 'all') {
      searchCriteria.subject = subject;
    }

    if (startDate || endDate) {
      searchCriteria.createdAt = {};
      if (startDate) {
        searchCriteria.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        searchCriteria.createdAt.$lte = new Date(endDate);
      }
    }

    const questions = await Question.find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Question.countDocuments(searchCriteria);

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Search questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search questions',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  searchQuestions
};
