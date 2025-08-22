const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const statAsync = promisify(fs.stat);

/**
 * Controller for video operations
 */
class VideoController {
  /**
   * Stream a video using range requests
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async streamVideo(req, res) {
    try {
      const { filename } = req.params;
      
      // Validate filename to prevent directory traversal attacks
      if (!filename || filename.includes('..')) {
        return res.status(400).send('Invalid filename');
      }
      
      // Extract filename from path if it contains slashes (from older references)
      const cleanFilename = filename.includes('/') ? 
        filename.split('/').pop() : filename;
      
      console.log(`🎬 Streaming video: ${cleanFilename}`);
      const videoPath = path.join(process.cwd(), '../uploads/videos', cleanFilename);
      
      // Check if file exists
      let stat;
      try {
        stat = await statAsync(videoPath);
      } catch (err) {
        console.error(`Video not found: ${filename}`, err);
        return res.status(404).send('Video not found');
      }
      
      const fileSize = stat.size;
      
      // Parse range header
      const range = req.headers.range;
      
      // If range header exists, process as range request
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        // Validate range
        if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize) {
          return res.status(416).send('Range Not Satisfiable');
        }
        
        // Calculate chunk size
        const chunkSize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        
        // Set response headers for partial content
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=86400' // Cache for 1 day
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
          'Cache-Control': 'public, max-age=86400' // Cache for 1 day
        };
        
        res.writeHead(200, headers);
        fs.createReadStream(videoPath).pipe(res);
      }
    } catch (error) {
      console.error('Error streaming video:', error);
      res.status(500).send('Server error while streaming video');
    }
  }
  
  /**
   * Get video info
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getVideoInfo(req, res) {
    try {
      const { filename } = req.params;
      
      // Validate filename to prevent directory traversal attacks
      if (!filename || filename.includes('..')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      // Extract filename from path if it contains slashes (from older references)
      const cleanFilename = filename.includes('/') ? 
        filename.split('/').pop() : filename;
      
      console.log(`ℹ️ Getting video info: ${cleanFilename}`);
      const videoPath = path.join(process.cwd(), '../uploads/videos', cleanFilename);
      
      // Check if file exists
      let stat;
      try {
        stat = await statAsync(videoPath);
      } catch (err) {
        console.error(`Video not found: ${filename}`, err);
        return res.status(404).json({ error: 'Video not found' });
      }
      
      // Return video info
      res.json({
        filename,
        size: stat.size,
        created: stat.birthtime,
        modified: stat.mtime,
        streamUrl: `/api/videos/stream/${filename}`
      });
    } catch (error) {
      console.error('Error getting video info:', error);
      res.status(500).json({ error: 'Server error while getting video info' });
    }
  }
}

module.exports = new VideoController();
