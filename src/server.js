const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { env } = require('./config/env');
const logger = require('./utils/logger');
const DatabaseSeeder = require('./utils/dbSeeder');

const PORT = env.PORT || 3000;

async function start() {
  try {
    await connectDB();

    if (env.SEED_FILE) {
      const seeder = new DatabaseSeeder(env.SEED_FILE);
      seeder
        .seed()
        .then(() => {
          logger.info('Database seed terminé.');
        })
        .catch((err) => {
          logger.error('Erreur lors du seeding au démarrage:', err);
        });
    } else {
      logger.warn('SEED_FILE non défini, seeding ignoré.');
    }

    const server = http.createServer(app);
    server.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      if (env.SWAGGER_ENABLED) {
        logger.info(`Swagger docs: http://localhost:${PORT}/api-docs`);
      }
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
