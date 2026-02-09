// scripts/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const { env } = require('./env');
const DatabaseSeeder = require('../utils/dbSeeder');
const logger = require('../utils/logger');

// Configuration
const MONGODB_URI = env.MONGODB_URI;
const SEED_FILE = env.SEED_FILE;

async function main() {
    try {
        // Connexion à MongoDB
        logger.info('🔌 Connexion à MongoDB...');
        await mongoose.connect(MONGODB_URI);
        logger.info('✅ Connecté à MongoDB\n');

        const seeder = new DatabaseSeeder(SEED_FILE);

        // Parser les arguments de ligne de commande
        const args = process.argv.slice(2);
        const command = args[0] || 'seed';

        switch (command) {
            case 'seed':
                await seeder.seed();
                break;

            case 'reset':
                await seeder.reset();
                await seeder.seed();
                break;

            case 'status':
                await seeder.showMigrationStatus();
                break;

            case 'clear':
                await seeder.reset();
                break;

            default:
                logger.info(`
                Commandes disponibles:
                seed    - Applique les seeds (défaut)
                reset   - Réinitialise et applique les seeds
                status  - Affiche l'état des migrations
                clear   - Supprime toutes les données
        `);
        }

    } catch (error) {
        logger.error('💥 Erreur:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        logger.info('🔌 Déconnecté de MongoDB');
    }
}

main();