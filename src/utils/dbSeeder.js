const mongoose = require('mongoose');
const fs = require('fs').promises;
const { Role, Store, Product, User } = require('../models');
const logger = require('logger');
const Migration = require('../models/migration.model');

class DatabaseSeeder {
    constructor(seedFilePath) {
        this.seedFilePath = seedFilePath;
        this.seedData = null;
    }

    /**
     * Charge les données depuis le fichier JSON
     */
    async loadSeedData() {
        try {
            const fileContent = await fs.readFile(this.seedFilePath, 'utf-8');
            this.seedData = JSON.parse(fileContent);
            logger.info(`✅ Données chargées depuis ${this.seedFilePath}`);
            return this.seedData;
        } catch (error) {
            logger.error(`❌ Erreur lors du chargement du fichier: ${error.message}`);
            throw error;
        }
    }

    /**
     * Vérifie si la migration a déjà été appliquée
     */
    async isMigrationApplied(version) {
        const migration = await Migration.findOne({
            version,
            status: 'success'
        });
        return !!migration;
    }

    /**
     * Enregistre l'état de la migration
     */
    async recordMigration(version, status, error = null) {
        await Migration.findOneAndUpdate(
            { version },
            {
                version,
                status,
                error,
                appliedAt: new Date()
            },
            { upsert: true, new: true }
        );
    }

    /**
     * Seed les rôles
     */
    async seedRoles(roles) {
        logger.info('\n📝 Seed des rôles...');
        let created = 0;
        let updated = 0;

        for (const roleData of roles) {
            // Générer des ObjectId pour les features
            const featuresWithIds = roleData.features.map(feature => ({
                ...feature,
                featureId: new mongoose.Types.ObjectId()
            }));

            const result = await Role.findOneAndUpdate(
                { _id: roleData._id },
                {
                    ...roleData,
                    features: featuresWithIds
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );

            if (result.isNew || !result.updatedAt) {
                created++;
                logger.info(`  ✅ Rôle créé: ${roleData._id}`);
            } else {
                updated++;
                logger.info(`  🔄 Rôle mis à jour: ${roleData._id}`);
            }
        }

        logger.info(`✅ Rôles: ${created} créés, ${updated} mis à jour`);
    }

    /**
     * Seed les magasins
     */
    async seedStores(stores) {
        logger.info('\n🏪 Seed des magasins...');
        let created = 0;
        let updated = 0;

        for (const storeData of stores) {
            const existingStore = await Store.findOne({ email: storeData.email });

            if (existingStore) {
                await Store.findByIdAndUpdate(existingStore._id, storeData);
                updated++;
                logger.info(`  🔄 Magasin mis à jour: ${storeData.name}`);
            } else {
                await Store.create(storeData);
                created++;
                logger.info(`  ✅ Magasin créé: ${storeData.name}`);
            }
        }

        logger.info(`✅ Magasins: ${created} créés, ${updated} mis à jour`);
    }

    /**
     * Seed les produits
     */
    async seedProducts(products) {
        logger.info('\n📦 Seed des produits...');
        let created = 0;
        let updated = 0;

        for (const productData of products) {
            // Générer des IDs pour les sous-documents
            const categoriesWithIds = productData.categories.map(cat => ({
                ...cat,
                categoryId: new mongoose.Types.ObjectId(),
                types: cat.types.map(type => ({
                    ...type,
                    typeId: new mongoose.Types.ObjectId()
                }))
            }));

            const imagesWithIds = productData.images.map(img => ({
                ...img,
                imageId: new mongoose.Types.ObjectId()
            }));

            const result = await Product.findOneAndUpdate(
                { _id: productData._id },
                {
                    ...productData,
                    categories: categoriesWithIds,
                    images: imagesWithIds,
                    storeData: productData.storeData || []
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );

            if (!result.updatedAt) {
                created++;
                logger.info(`  ✅ Produit créé: ${productData.name}`);
            } else {
                updated++;
                logger.info(`  🔄 Produit mis à jour: ${productData.name}`);
            }
        }

        logger.info(`✅ Produits: ${created} créés, ${updated} mis à jour`);
    }

    /**
     * Seed les données produit-magasin
     */
    async seedProductStoreData(productStoreData) {
        logger.info('\n💰 Seed des données produit-magasin...');
        let added = 0;
        let updated = 0;

        for (const data of productStoreData) {
            const product = await Product.findById(data.productId);
            const store = await Store.findOne({ email: data.storeEmail });

            if (!product) {
                logger.info(`  ⚠️  Produit non trouvé: ${data.productId}`);
                continue;
            }

            if (!store) {
                logger.info(`  ⚠️  Magasin non trouvé: ${data.storeEmail}`);
                continue;
            }

            // Vérifier si les données existent déjà
            const storeDataIndex = product.storeData.findIndex(
                sd => sd.storeId.toString() === store._id.toString()
            );

            // Préparer les données avec IDs
            const priceHistoryWithDates = data.priceHistory.map(ph => ({
                price: mongoose.Types.Decimal128.fromString(ph.price.toString()),
                updatedAt: new Date(ph.updatedAt)
            }));

            const promotionsWithIds = data.promotions.map(promo => ({
                promotionId: new mongoose.Types.ObjectId(),
                discount: mongoose.Types.Decimal128.fromString(promo.discount.toString()),
                description: promo.description,
                startDate: new Date(promo.startDate),
                endDate: new Date(promo.endDate),
                isActive: promo.isActive
            }));

            const newStoreData = {
                storeId: store._id,
                currentPrice: mongoose.Types.Decimal128.fromString(data.currentPrice.toString()),
                createdAt: new Date(),
                priceHistory: priceHistoryWithDates,
                promotions: promotionsWithIds,
                stockMovements: []
            };

            if (storeDataIndex === -1) {
                // Ajouter
                product.storeData.push(newStoreData);
                added++;
                logger.info(`  ✅ Données ajoutées: ${product.name} -> ${store.name}`);
            } else {
                // Mettre à jour
                product.storeData[storeDataIndex] = {
                    ...newStoreData,
                    stockMovements: product.storeData[storeDataIndex].stockMovements
                };
                updated++;
                logger.info(`  🔄 Données mises à jour: ${product.name} -> ${store.name}`);
            }

            await product.save();
        }

        logger.info(`✅ Données produit-magasin: ${added} ajoutées, ${updated} mises à jour`);
    }

    /**
     * Exécute le seeding complet
     */
    async seed() {
        try {
            logger.info('\n🌱 Début du seeding de la base de données...\n');

            // Charger les données
            await this.loadSeedData();

            const version = this.seedData.version;

            // Vérifier si déjà appliqué
            const alreadyApplied = await this.isMigrationApplied(version);
            if (alreadyApplied) {
                logger.info(`ℹ️  Migration version ${version} déjà appliquée. Abandon.`);
                return;
            }

            // Marquer comme en cours
            await this.recordMigration(version, 'pending');

            // Exécuter les seeds dans l'ordre
            if (this.seedData.seeds.roles) {
                await this.seedRoles(this.seedData.seeds.roles);
            }

            if (this.seedData.seeds.stores) {
                await this.seedStores(this.seedData.seeds.stores);
            }

            if (this.seedData.seeds.products) {
                await this.seedProducts(this.seedData.seeds.products);
            }

            if (this.seedData.seeds.productStoreData) {
                await this.seedProductStoreData(this.seedData.seeds.productStoreData);
            }

            // Marquer comme réussi
            await this.recordMigration(version, 'success');

            logger.info('\n✅ Seeding terminé avec succès!\n');
        } catch (error) {
            logger.error('\n❌ Erreur lors du seeding:', error);

            if (this.seedData && this.seedData.version) {
                await this.recordMigration(this.seedData.version, 'failed', error.message);
            }

            throw error;
        }
    }

    /**
     * Réinitialise complètement la base de données
     */
    async reset() {
        logger.info('\n⚠️  RESET de la base de données...\n');

        await Role.deleteMany({});
        await Store.deleteMany({});
        await Product.deleteMany({});
        await User.deleteMany({});
        await Migration.deleteMany({});

        logger.info('✅ Base de données réinitialisée\n');
    }

    /**
     * Affiche l'état des migrations
     */
    async showMigrationStatus() {
        const migrations = await Migration.find().sort({ appliedAt: -1 });

        logger.info('\n📊 État des migrations:\n');

        if (migrations.length === 0) {
            logger.info('  Aucune migration appliquée');
        } else {
            migrations.forEach(migration => {
                const status = migration.status === 'success' ? '✅' :
                    migration.status === 'failed' ? '❌' : '⏳';
                logger.info(`  ${status} Version ${migration.version} - ${migration.status} - ${migration.appliedAt.toISOString()}`);
                if (migration.error) {
                    logger.info(`     Erreur: ${migration.error}`);
                }
            });
        }

        logger.info('');
    }
}

module.exports = DatabaseSeeder;