const Conversation = require('../models/Conversation');
const Question = require('../models/Question');

const createConversation = async (req, res) => {
  try {
    const { subject, title } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required'
      });
    }

    const conversation = new Conversation({
  userId: '000000000000000000000000', // Fallback ObjectId for anonymous
      subject,
      title,
      lastActivityAt: new Date()
    });

    await conversation.save();
    console.log('New conversation created:', conversation._id);

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: {
        conversation
      }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
      error: error.message
    });
  }
};

const getConversations = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, active = true } = req.query;

  const query = { userId: '000000000000000000000000' }; // Fallback ObjectId for anonymous
    
    if (subject && subject !== 'all') {
      query.subject = subject;
    }

    if (active !== 'all') {
      query.isActive = active === 'true';
    }

    const conversations = await Conversation.find(query)
      .sort({ lastActivityAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Conversation.countDocuments(query);

    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
};

const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeQuestions = false, questionsPage = 1, questionsLimit = 20 } = req.query;

    const conversation = await Conversation.findOne({
      _id: id,
  userId: '000000000000000000000000' // Fallback ObjectId for anonymous
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    let responseData = { conversation };

    if (includeQuestions === 'true') {
      const questions = await Question.find({ 
        conversationId: id,
  userId: '000000000000000000000000' // Fallback ObjectId for anonymous
      })
        .sort({ createdAt: 1 })
        .limit(questionsLimit * 1)
        .skip((questionsPage - 1) * questionsLimit)
        .exec();

      const totalQuestions = await Question.countDocuments({ 
        conversationId: id,
  userId: '000000000000000000000000' // Fallback ObjectId for anonymous
      });

      responseData.questions = questions;
      responseData.questionsPagination = {
        page: parseInt(questionsPage),
        limit: parseInt(questionsLimit),
        total: totalQuestions,
        pages: Math.ceil(totalQuestions / questionsLimit)
      };
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
      error: error.message
    });
  }
};

const updateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, isActive } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (isActive !== undefined) updateData.isActive = isActive;
    updateData.lastActivityAt = new Date();

    const conversation = await Conversation.findOneAndUpdate(
  { _id: id, userId: '000000000000000000000000' }, // Update anonymous user conversation
      updateData,
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      message: 'Conversation updated successfully',
      data: {
        conversation
      }
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update conversation',
      error: error.message
    });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete all questions in the conversation
    await Question.deleteMany({ 
      conversationId: id,
  userId: '000000000000000000000000' // Delete anonymous user questions
    });

    // Delete the conversation
    const conversation = await Conversation.findOneAndDelete({
      _id: id,
  userId: '000000000000000000000000' // Delete anonymous user conversation
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      message: 'Conversation and all related questions deleted successfully'
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
};

module.exports = {
  createConversation,
  getConversations,
  getConversation,
  updateConversation,
  deleteConversation
};
