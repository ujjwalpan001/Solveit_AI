const Question = require('../models/Question');
const llmService = require('../services/llmService');
const jobQueue = require('../jobs/jobQueue');

const askQuestion = async (req, res) => {
  try {
    console.log('Ask question request received:', req.body);
    const { question, subject, generateVideo = false } = req.body;

    if (!question || !subject) {
      console.log('Missing question or subject');
      return res.status(400).json({
        success: false,
        message: 'Question and subject are required'
      });
    }

    console.log('Generating answer for question:', question, 'subject:', subject);
    // Generate answer using LLM
    const answer = await llmService.generateAnswer(question, subject);
    console.log('Answer generated:', answer);

    // Create question document
    const questionDoc = new Question({
      userId: req.user._id,
      question,
      subject,
      answer,
      status: generateVideo ? 'pending' : 'completed',
      completedAt: generateVideo ? null : new Date()
    });

    await questionDoc.save();
    console.log('Question saved to database');

    // Add to job queue if video generation is requested
    if (generateVideo) {
      jobQueue.addJob('generateVideo', {
        questionId: questionDoc._id,
        question,
        answer,
        language: req.user.preferences.language,
        voice: req.user.preferences.voice
      });
    }

    res.status(201).json({
      success: true,
      message: 'Question processed successfully',
      data: {
        question: questionDoc
      }
    });
  } catch (error) {
    console.error('Ask question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process question',
      error: error.message
    });
  }
};

const getQuestions = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, search } = req.query;

    const query = { userId: req.user._id };
    
    if (subject && subject !== 'all') {
      query.subject = subject;
    }

    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { 'answer.text': { $regex: search, $options: 'i' } }
      ];
    }

    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Question.countDocuments(query);

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
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questions',
      error: error.message
    });
  }
};

const getQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      data: {
        question
      }
    });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get question',
      error: error.message
    });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message
    });
  }
};

const generateVideoForQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (question.status === 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Video generation already in progress'
      });
    }

    // Update status to processing
    question.status = 'processing';
    question.processingStartedAt = new Date();
    await question.save();

    // Add to job queue
    jobQueue.addJob('generateVideo', {
      questionId: question._id,
      question: question.question,
      answer: question.answer,
      language: req.user.preferences.language,
      voice: req.user.preferences.voice
    });

    res.json({
      success: true,
      message: 'Video generation started',
      data: {
        question
      }
    });
  } catch (error) {
    console.error('Generate video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start video generation',
      error: error.message
    });
  }
};

module.exports = {
  askQuestion,
  getQuestions,
  getQuestion,
  deleteQuestion,
  generateVideoForQuestion
};
