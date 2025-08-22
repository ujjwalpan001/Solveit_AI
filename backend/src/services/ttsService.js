const axios = require('axios');
const config = require('../config');

const generateAudio = async (answer, language = 'en', voice = 'female') => {
  console.log('🔊 TTS SERVICE: Starting audio generation');
  console.log(`   Language: ${language}, Voice: ${voice}`);
  
  try {
    // Use TTS script if available, fallback to regular text
    const text = answer.tts || answer.text || 'No content available';
    console.log(`   Using TTS script: ${text.substring(0, 100)}...`);
    
    // Force IPv4 by using 127.0.0.1 instead of localhost  
    const workerUrl = config.WORKER_URL.replace('localhost', '127.0.0.1');
    
    const response = await axios.post(`${workerUrl}/generate-audio`, {
      text,
      language,
      voice
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close'
      }
    });
    
    console.log('✅ TTS SERVICE: Audio generated successfully');
    console.log('   Response:', response.data);

    return response.data;
  } catch (error) {
    console.error('💥 TTS SERVICE Error:', error.message);
    console.error('   Error details:', error.response?.data || error.message);
    throw new Error(`Failed to generate audio: ${error.message}`);
  }
};

module.exports = {
  generateAudio
};
