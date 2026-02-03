const mongoose = require('mongoose');
const { env } = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

async function connectDB() {
  const uri = env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI manquant');

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    logger.info('Connecté à MongoDB');
  } catch (err) {
    logger.error('Erreur connexion MongoDB', err);
    throw err;
  }

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB déconnecté'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnecté'));
}

module.exports = { connectDB };

