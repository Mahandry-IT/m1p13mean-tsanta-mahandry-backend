const mongoose = require('mongoose');
const fs = require('fs').promises;
const { Role, Store, Product, User, Menu, Category, Type } = require('../models');
const logger = require('./logger');
const Migration = require('../models/migration.model');
const bcrypt = require('bcryptjs');

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

            // Déterminer l'utilisateur à lier: priorité à userId dans le JSON,
            // sinon via userEmail (si fourni), sinon fallback via email de la boutique.
            let relatedUser = null;
            let userIdToAssign = null;

            const tryCastObjectId = (value) => {
                if (!value) return null;
                // Déjà un ObjectId
                if (value instanceof mongoose.Types.ObjectId) return value;
                // String hex 24
                if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
                    return mongoose.Types.ObjectId.createFromHexString(value);
                }
                return null;
            };

            // 1) userId explicite
            const castedUserId = tryCastObjectId(storeData.userId);
            if (castedUserId) {
                relatedUser = await User.findById(castedUserId);
                userIdToAssign = relatedUser ? relatedUser._id : null;
            }

            // 2) userEmail explicite (si tu veux lier par email owner)
            if (!userIdToAssign && storeData.userEmail) {
                relatedUser = await User.findOne({ email: String(storeData.userEmail).toLowerCase().trim() });
                userIdToAssign = relatedUser ? relatedUser._id : null;
            }

            // 3) fallback: email de la boutique
            if (!userIdToAssign) {
                relatedUser = await User.findOne({ email: String(storeData.email).toLowerCase().trim() });
                userIdToAssign = relatedUser ? relatedUser._id : null;
            }

            const payload = { ...storeData, userId: userIdToAssign || null };
            // On ne persiste pas userEmail dans Store
            delete payload.userEmail;

            if (existingStore) {
                await Store.findByIdAndUpdate(existingStore._id, payload);
                updated++;
                logger.info(`  🔄 Magasin mis à jour: ${storeData.name}`);
            } else {
                await Store.create(payload);
                created++;
                logger.info(`  ✅ Magasin créé: ${storeData.name}`);
            }

            if (userIdToAssign) {
                const userInfo = relatedUser && relatedUser.email ? `${relatedUser.email} (${userIdToAssign.toString()})` : userIdToAssign.toString();
                logger.info(`     ↪️  Lié à l'utilisateur ${userInfo}`);
            } else {
                logger.info('     ↪️  Aucun utilisateur correspondant trouvé, userId = null');
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

        const toSlug = (value) => String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Cache simples
        const categoryCache = new Map(); // slug -> Category
        const typeCache = new Map(); // categoryId::typeSlug -> Type

        const getCategoryBySlug = async (slug) => {
            if (!slug) return null;
            if (categoryCache.has(slug)) return categoryCache.get(slug);
            const cat = await Category.findOne({ slug });
            categoryCache.set(slug, cat || null);
            return cat || null;
        };

        const getTypeByCategoryAndSlug = async (categoryId, typeSlug) => {
            const key = `${String(categoryId)}::${typeSlug}`;
            if (typeCache.has(key)) return typeCache.get(key);
            const t = await Type.findOne({ categoryId, slug: typeSlug });
            typeCache.set(key, t || null);
            return t || null;
        };

        for (const productData of products) {
            const imagesWithIds = (productData.images || []).map(img => ({
                ...img,
                imageId: new mongoose.Types.ObjectId()
            }));

            // Convertir categories(name/types.name) -> [{categoryId, typeIds}]
            const categoriesMap = new Map(); // categoryId(str) -> Set(typeId)

            for (const c of (productData.categories || [])) {
                const categorySlug = toSlug(c?.name);
                const categoryDoc = await getCategoryBySlug(categorySlug);
                if (!categoryDoc) {
                    logger.warn(`  ⚠️  Catégorie inconnue pour le produit ${productData.name}: ${c?.name}`);
                    continue;
                }

                const catKey = String(categoryDoc._id);
                if (!categoriesMap.has(catKey)) categoriesMap.set(catKey, new Set());

                for (const t of (c.types || [])) {
                    const typeSlug = toSlug(t?.name);
                    const typeDoc = await getTypeByCategoryAndSlug(categoryDoc._id, typeSlug);
                    if (!typeDoc) {
                        logger.warn(`  ⚠️  Type inconnu pour le produit ${productData.name}: ${c?.name} -> ${t?.name}`);
                        continue;
                    }
                    categoriesMap.get(catKey).add(String(typeDoc._id));
                }
            }

            const categories = Array.from(categoriesMap.entries()).map(([catId, typeIdSet]) => ({
                categoryId: new mongoose.Types.ObjectId(catId),
                typeIds: Array.from(typeIdSet).map((tid) => new mongoose.Types.ObjectId(tid))
            }));

            const result = await Product.findOneAndUpdate(
                { _id: productData._id },
                {
                    ...productData,
                    categories,
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
     * Seed des utilisateurs (utilise roleId)
     */
    async seedUsers(users) {
        logger.info('\n👤 Seed des utilisateurs...');
        let created = 0;
        let updated = 0;

        for (const u of users) {
            const roleId = u.roleId || (u.role && u.role.roleId) || null;

            if (!roleId) {
                logger.warn(`  ⚠️  roleId manquant pour l'utilisateur: ${u.email}`);
                continue;
            }

            const roleExists = await Role.findById(roleId);
            if (!roleExists) {
                logger.warn(`  ⚠️  Rôle inexistant (${roleId}) pour l'utilisateur: ${u.email}. Skipping.`);
                continue;
            }

            const existing = await User.findOne({ email: u.email });
            const passwordHash = await bcrypt.hash(u.password || 'ChangeMe123!', 10);

            // Construire le profil depuis u.profile ou depuis anciens champs pour compatibilité
            const profile = {
                firstName: u.profile?.firstName ?? u.firstName,
                lastName: u.profile?.lastName ?? u.lastName,
                phone: u.profile?.phone ?? u.phone,
                birthday: u.profile?.birthday ?? u.birthday ?? null,
                gender: u.profile?.gender ?? u.gender ?? 'Non défini'
            };

            if (existing) {
                // Mettre à jour champs principaux et rôle
                existing.username = u.username || existing.username;
                existing.profile = {
                    firstName: profile.firstName || existing.profile?.firstName,
                    lastName: profile.lastName || existing.profile?.lastName,
                    phone: profile.phone || existing.profile?.phone,
                    birthday: profile.birthday || existing.profile?.birthday,
                    gender: profile.gender || existing.profile?.gender || 'Non défini'
                };
                existing.roleId = roleId;
                existing.status = u.status || existing.status || 'active';
                // Mettre à jour passwordHistory si différent
                const last = (existing.passwordHistory || []).slice(-1)[0];
                if (!last || !(await bcrypt.compare(u.password || 'ChangeMe123!', last.passwordHash))) {
                    existing.passwordHistory = [
                        ...(existing.passwordHistory || []),
                        { passwordHash, createdAt: new Date() }
                    ];
                }
                await existing.save();
                updated++;
                logger.info(`  🔄 Utilisateur mis à jour: ${u.email}`);
            } else {
                await User.create({
                    username: u.username,
                    email: u.email,
                    roleId,
                    status: u.status || 'active',
                    profile,
                    passwordHistory: [{ passwordHash, createdAt: new Date() }],
                    failedAttempts: 0,
                    sessions: [],
                    favorites: []
                });
                created++;
                logger.info(`  ✅ Utilisateur créé: ${u.email}`);
            }
        }

        logger.info(`✅ Utilisateurs: ${created} créés, ${updated} mis à jour`);
    }

    /**
     * Seed les menus
     * Format attendu (dans data.json):
     * {
     *   label, path, icon, order,
     *   roles: ["<roleIdString>", ...],
     *   parentPath: "/admin" | null
     * }
     */
    async seedMenus(menus) {
        logger.info('\n\ud83d\udcc3 Seed des menus...');

        // Si l'index existe encore, il empêche des labels identiques (ex: "Produits").
        try {
            const indexes = await Menu.collection.indexes();
            const hasLegacyUniqueLabel = indexes.some((i) => i.name === 'label_1' && i.unique);
            if (hasLegacyUniqueLabel) {
                await Menu.collection.dropIndex('label_1');
                logger.info('  🧹 Index legacy supprimé: label_1 (unique)');
            }
        } catch (e) {
            // Ne pas bloquer le seed si l'index n'existe pas / pas de droits.
            logger.warn(`  ⚠️  Impossible de vérifier/supprimer l'index legacy label_1: ${e.message}`);
        }

        let created = 0;
        let updated = 0;

        // 1) Upsert des menus sans parentId (on le fixe en 2e passe)
        const pathToMenuId = new Map();

        for (const m of menus) {
            const roleIds = Array.isArray(m.roles) ? m.roles : [];

            // Les _id de Role sont des strings dans ce projet -> on les stocke dans Menu en ObjectId.
            // On fait donc une conversion stable via createFromHexString.
            const roleObjectIds = roleIds.map((rid) => mongoose.Types.ObjectId.createFromHexString(rid));

            const payload = {
                label: m.label,
                path: m.path,
                icon: m.icon,
                order: m.order ?? 0,
                permissions: { roles: roleObjectIds },
                parentId: null
            };

            const existing = await Menu.findOne({ path: m.path });
            if (existing) {
                await Menu.findByIdAndUpdate(existing._id, payload, { runValidators: true });
                updated++;
                pathToMenuId.set(m.path, existing._id);
                logger.info(`  \ud83d\udd04 Menu mis \u00e0 jour: ${m.path}`);
            } else {
                const createdMenu = await Menu.create(payload);
                created++;
                pathToMenuId.set(m.path, createdMenu._id);
                logger.info(`  \u2705 Menu cr\u00e9\u00e9: ${m.path}`);
            }
        }

        // 2) Deuxième passe: mise à jour des parentId
        for (const m of menus) {
            const parentPath = m.parentPath ?? null;
            if (!parentPath) continue;

            const childId = pathToMenuId.get(m.path);
            const parentId = pathToMenuId.get(parentPath);

            if (!childId) continue;
            if (!parentId) {
                logger.warn(`  \u26a0\ufe0f parentPath introuvable (${parentPath}) pour le menu ${m.path}`);
                continue;
            }

            await Menu.findByIdAndUpdate(childId, { parentId }, { runValidators: true });
        }

        logger.info(`\u2705 Menus: ${created} cr\u00e9\u00e9s, ${updated} mis \u00e0 jour`);
    }

    /**
     * Seed des catégories
     */
    async seedCategories(categories) {
        logger.info('\n🏷️ Seed des catégories...');
        let created = 0;
        let updated = 0;

        for (const c of categories) {
            const payload = {
                name: c.name,
                slug: c.slug,
                description: c.description ?? '',
                isActive: c.isActive ?? true,
            };

            const existing = await Category.findOne({ slug: payload.slug });
            if (existing) {
                await Category.findByIdAndUpdate(existing._id, payload, { runValidators: true });
                updated++;
                logger.info(`  🔄 Catégorie mise à jour: ${payload.slug}`);
            } else {
                await Category.create(payload);
                created++;
                logger.info(`  ✅ Catégorie créée: ${payload.slug}`);
            }
        }

        logger.info(`✅ Catégories: ${created} créées, ${updated} mises à jour`);
    }

    /**
     * Seed des types (type de catégorie)
     * Attendu: [{ categorySlug, name, slug, isActive }]
     */
    async seedTypes(types) {
        logger.info('\n🧩 Seed des types...');
        let created = 0;
        let updated = 0;

        for (const t of types) {
            const category = await Category.findOne({ slug: t.categorySlug });
            if (!category) {
                logger.warn(`  ⚠️  Catégorie introuvable (slug=${t.categorySlug}) pour le type ${t.name}. Skipping.`);
                continue;
            }

            const payload = {
                categoryId: category._id,
                name: t.name,
                slug: t.slug,
                isActive: t.isActive ?? true,
            };

            const existing = await Type.findOne({ categoryId: category._id, slug: payload.slug });
            if (existing) {
                await Type.findByIdAndUpdate(existing._id, payload, { runValidators: true });
                updated++;
                logger.info(`  🔄 Type mis à jour: ${t.categorySlug}/${payload.slug}`);
            } else {
                await Type.create(payload);
                created++;
                logger.info(`  ✅ Type créé: ${t.categorySlug}/${payload.slug}`);
            }
        }

        logger.info(`✅ Types: ${created} créés, ${updated} mis à jour`);
    }

    /**
     * Construit automatiquement categories/types depuis les products legacy (embed)
     * si categories/types ne sont pas fournis dans data.json
     */
    buildCategoriesAndTypesFromProducts(products = []) {
        const toSlug = (value) => String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');

        const categoryMap = new Map(); // slug -> {name,slug,description,isActive}
        const typeKeySet = new Set();
        const types = [];

        for (const p of products) {
            const cats = Array.isArray(p.categories) ? p.categories : [];
            for (const c of cats) {
                const cName = c?.name;
                if (!cName) continue;
                const cSlug = toSlug(cName);
                if (!cSlug) continue;

                if (!categoryMap.has(cSlug)) {
                    categoryMap.set(cSlug, { name: cName, slug: cSlug, description: '', isActive: true });
                }

                const tps = Array.isArray(c.types) ? c.types : [];
                for (const t of tps) {
                    const tName = t?.name;
                    if (!tName) continue;
                    const tSlug = toSlug(tName);
                    if (!tSlug) continue;

                    const key = `${cSlug}::${tSlug}`;
                    if (typeKeySet.has(key)) continue;
                    typeKeySet.add(key);

                    types.push({ categorySlug: cSlug, name: tName, slug: tSlug, isActive: true });
                }
            }
        }

        return {
            categories: Array.from(categoryMap.values()),
            types,
        };
    }

    /**
     * Exécute le seeding complet
     */
    async seed() {
        try {
            logger.info('\n\ud83c\udf31 D\u00e9but du seeding de la base de donn\u00e9es...\n');

            // Charger les donn\u00e9es
            await this.loadSeedData();

            const version = this.seedData.version;

            // V\u00e9rifiez si d\u00e9j\u00e0 appliqu\u00e9
            const alreadyApplied = await this.isMigrationApplied(version);
            if (alreadyApplied) {
                logger.info(`\u2139\ufe0f  Migration version ${version} d\u00e9j\u00e0 appliqu\u00e9e. Abandon.`);
                return;
            }

            // Marquer comme en cours
            await this.recordMigration(version, 'pending');

            // Ex\u00e9cuter les seeds dans l'ordre
            if (this.seedData.seeds.roles) {
                await this.seedRoles(this.seedData.seeds.roles);
            }

            // Seed users avant stores pour permettre la liaison userId
            if (this.seedData.seeds.users) {
                await this.seedUsers(this.seedData.seeds.users);
            }

            if (this.seedData.seeds.stores) {
                await this.seedStores(this.seedData.seeds.stores);
            }

            // Catégories / Types
            const hasCategories = Array.isArray(this.seedData.seeds.categories) && this.seedData.seeds.categories.length > 0;
            const hasTypes = Array.isArray(this.seedData.seeds.types) && this.seedData.seeds.types.length > 0;

            // Si non fourni, on les construit depuis les produits legacy
            if (!hasCategories || !hasTypes) {
                const built = this.buildCategoriesAndTypesFromProducts(this.seedData.seeds.products || []);
                if (!hasCategories) this.seedData.seeds.categories = built.categories;
                if (!hasTypes) this.seedData.seeds.types = built.types;
            }

            if (this.seedData.seeds.categories) {
                await this.seedCategories(this.seedData.seeds.categories);
            }

            if (this.seedData.seeds.types) {
                await this.seedTypes(this.seedData.seeds.types);
            }

            if (this.seedData.seeds.products) {
                await this.seedProducts(this.seedData.seeds.products);
            }

            if (this.seedData.seeds.productStoreData) {
                await this.seedProductStoreData(this.seedData.seeds.productStoreData);
            }

            if (this.seedData.seeds.menus) {
                await this.seedMenus(this.seedData.seeds.menus);
            }

            // Marquer comme r\u00e9ussi
            await this.recordMigration(version, 'success');

            logger.info('\n\u2705 Seeding termin\u00e9 avec succ\u00e8s!\n');
        } catch (error) {
            logger.error('\n\u274c Erreur lors du seeding:', error);

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
        await Menu.deleteMany({});
        await Category.deleteMany({});
        await Type.deleteMany({});
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

