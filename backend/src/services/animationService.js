const axios = require('axios');
const config = require('../config');

const generateVideo = async (question, answer, options = {}) => {
  console.log('🎬 NODE.JS: Starting video generation request');
  console.log(`   Question: ${question?.substring(0, 50)}...`);
  console.log(`   Answer keys: ${answer ? Object.keys(answer) : 'None'}`);
  console.log(`   Options:`, options);
  
  // Force IPv4 by using 127.0.0.1 instead of localhost
  const workerUrl = config.WORKER_URL.replace('localhost', '127.0.0.1');
  console.log(`   Worker URL: ${workerUrl}/generate-video`);
  
  try {
    const requestData = {
      question,
      answer,
      language: options.language || 'en',
      voice: options.voice || 'female',
      ...options
    };
    
    console.log('🚀 NODE.JS: Sending request to Python server...');
    console.log('   Request data keys:', Object.keys(requestData));
    
    const response = await axios.post(`${workerUrl}/generate-video`, requestData, {
      timeout: 120000, // 2 minutes timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ NODE.JS: Received response from Python server');
    console.log('   Response status:', response.status);
    console.log('   Response data:', response.data);

    // Check if the Python server returned a failure response
    if (!response.data.success) {
      console.error('🔥 NODE.JS: Python server returned failure:', response.data.error);
      throw new Error(`Video generation failed: ${response.data.error || 'Unknown error'}`);
    }

    return response.data;
  } catch (error) {
    console.error('💥 NODE.JS Animation Service Error:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error config URL:', error.config?.url);
    console.error('   Error response status:', error.response?.status);
    console.error('   Error response data:', error.response?.data);
    if (error.response?.data) {
      console.error('   Detailed error:', error.response.data);
    }
    throw new Error(`Failed to generate video: ${error.message}`);
  }
};

module.exports = {
  generateVideo
};
