const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  NEBIUS_API_KEY: process.env.NEBIUS_API_KEY,
  WORKER_URL: process.env.WORKER_URL || 'http://localhost:8000',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
