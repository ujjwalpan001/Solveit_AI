const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    enum: ['math', 'science', 'history', 'coding', 'general'],
    required: true
  },
  answer: {
    type: {
      text: String,
      steps: [{
        type: {
          type: String,
          enum: ['text', 'equation', 'code', 'explanation']
        },
        content: String
      }]
    },
    required: true
  },
  videoPath: {
    type: String,
    default: null
  },
  audioPath: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingStartedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  metadata: {
    processingTime: Number,
    videoGenerated: {
      type: Boolean,
      default: false
    },
    audioGenerated: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Index for efficient searching
questionSchema.index({ userId: 1, createdAt: -1 });
questionSchema.index({ conversationId: 1, createdAt: 1 });
questionSchema.index({ subject: 1 });
questionSchema.index({ status: 1 });

module.exports = mongoose.model('Question', questionSchema);
