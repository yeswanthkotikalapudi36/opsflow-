require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/opsflow',
  jwtSecret: process.env.JWT_SECRET || 'opsflow_default_dev_secret_key_9942',
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  geminiApiKey: process.env.GEMINI_API_KEY || null,
};
