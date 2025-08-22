const fs = require('fs');
const path = require('path');

/**
 * Video streaming middleware to handle range requests properly
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const streamVideo = (req, res) => {
  const videoPath = path.resolve(__dirname, '../../uploads/videos', req.params.filename);
  
  // Check if file exists
  fs.stat(videoPath, (err, stat) => {
    if (err) {
      console.error(`Error accessing video file: ${err.message}`);
      return res.status(404).send('Video not found');
    }
    
    // Get file size
    const fileSize = stat.size;
    
    // Parse range header
    const range = req.headers.range;
    
    // If range header exists, process as range request
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      // Calculate chunk size
      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      
      // Set response headers for partial content
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };
      
      // Send partial content response
      res.writeHead(206, headers);
      file.pipe(res);
    } else {
      // If no range header, send the entire file
      const headers = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400'
      };
      
      res.writeHead(200, headers);
      fs.createReadStream(videoPath).pipe(res);
    }
  });
};

module.exports = streamVideo;
