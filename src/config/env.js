const dotenv = require('dotenv');
const path = require("path");

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/express_api',
  JWT_SECRET: process.env.JWT_SECRET || 'changeme-in-prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim()),
  SWAGGER_ENABLED: (process.env.SWAGGER_ENABLED || 'true') === 'true',
  MAX_ATTEMPTS: parseInt(process.env.MAX_ATTEMPTS, 3) || 5,
  SEED_FILE: path.join(__dirname, '../database/data.json')
};

module.exports = { env };
