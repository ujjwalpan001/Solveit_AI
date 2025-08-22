const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const connectDB = require('./utils/dbConnection');
const errorMiddleware = require('./middlewares/errorMiddleware');
const jobQueue = require('./jobs/jobQueue');

// Routes
const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/videoRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Content-Disposition'] // Important for downloads
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (for video uploads) with CORS headers and proper caching
app.use('/uploads', (req, res, next) => {
  // Allow CORS for videos
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Log the request path for debugging
  console.log(`📂 Static file request: ${req.path}`);
  
  // Set caching headers for better performance
  if (req.path.endsWith('.mp4') || req.path.endsWith('.mp3')) {
    // Cache videos for 1 day
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
  
  next();
}, express.static(path.join(process.cwd(), '../uploads'), {
  // Better static file options
  etag: true,
  lastModified: true,
  maxAge: '1d',
  index: false,
  immutable: true,
  // Add content-type headers for video files
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mp3');
    }
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV 
  });
});

// Error handling middleware
app.use(errorMiddleware);

// Start job queue
jobQueue.start();

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
});

module.exports = app;
