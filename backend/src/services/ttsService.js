const axios = require('axios');
const config = require('../config');

const generateAudio = async (text, language = 'en', voice = 'female') => {
  try {
    const response = await axios.post(`${config.WORKER_URL}/generate-audio`, {
      text,
      language,
      voice
    });

    return response.data;
  } catch (error) {
    console.error('TTS Service Error:', error);
    throw new Error('Failed to generate audio');
  }
};

module.exports = {
  generateAudio
};
