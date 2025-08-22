const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  subject: {
    type: String,
    enum: ['math', 'science', 'history', 'coding', 'general'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  questionCount: {
    type: Number,
    default: 0
  },
  metadata: {
    totalVideoTime: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for efficient searching
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ userId: 1, isActive: 1 });
conversationSchema.index({ subject: 1 });

// Auto-generate title if not provided
conversationSchema.pre('save', function(next) {
  if (!this.title && this.isNew) {
    const subjects = {
      math: 'Mathematics',
      science: 'Science',
      history: 'History',
      coding: 'Programming',
      general: 'General'
    };
    this.title = `${subjects[this.subject]} Conversation - ${new Date().toLocaleDateString()}`;
  }
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
