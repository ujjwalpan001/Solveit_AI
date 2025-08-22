const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const path = require('path');
const fs = require('fs');

// Log available videos on startup
const videosDir = path.join(process.cwd(), '../uploads/videos');  // Using process.cwd() for more reliable path
console.log('🎥 Video directory:', videosDir);
try {
  if (fs.existsSync(videosDir)) {
    const files = fs.readdirSync(videosDir);
    console.log(`🎬 Found ${files.length} videos in the directory:`);
    files.slice(0, 10).forEach(file => console.log(`   - ${file}`));  // Show first 10 only
    if (files.length > 10) {
      console.log(`   - ... and ${files.length - 10} more files`);
    }
  } else {
    console.log('⚠️ Videos directory does not exist!');
  }
} catch (err) {
  console.error('❌ Error checking videos directory:', err);
}

// Debug middleware
router.use('/stream/:filename', (req, res, next) => {
  console.log(`🎬 Video stream request for: ${req.params.filename}`);
  next();
});

// Stream video with range request support
router.get('/stream/:filename', videoController.streamVideo);

// Get video info
router.get('/info/:filename', videoController.getVideoInfo);

module.exports = router;
