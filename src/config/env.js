const dotenv = require('dotenv');

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/express_api',
  JWT_SECRET: process.env.JWT_SECRET || 'changeme-in-prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim()),
  SWAGGER_ENABLED: (process.env.SWAGGER_ENABLED || 'true') === 'true'
};

module.exports = { env };

