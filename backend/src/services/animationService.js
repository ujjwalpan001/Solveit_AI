const axios = require('axios');
const config = require('../config');

const generateVideo = async (question, answer, options = {}) => {
  try {
    const response = await axios.post(`${config.WORKER_URL}/generate-video`, {
      question,
      answer,
      ...options
    });

    return response.data;
  } catch (error) {
    console.error('Animation Service Error:', error);
    throw new Error('Failed to generate video');
  }
};

module.exports = {
  generateVideo
};
