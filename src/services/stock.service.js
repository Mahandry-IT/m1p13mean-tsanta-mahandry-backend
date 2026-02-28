const Product = require('../models/product.model');
const Store = require('../models/store.model');
const mongoose = require('mongoose');

/**
 * Calcule le stock actuel à partir des mouvements
 * @param {Array} stockMovements - Tableau des mouvements de stock
 * @returns {Number} - Stock actuel (entrées - sorties)
 */
function calculateCurrentStock(stockMovements) {
    if (!stockMovements || stockMovements.length === 0) {
        return 0;
    }

    const totalEntries = stockMovements
        .filter(m => m.isEntry === true)
        .reduce((sum, m) => sum + m.quantity, 0);

    const totalExits = stockMovements
        .filter(m => m.isEntry === false)
        .reduce((sum, m) => sum + m.quantity, 0);

    return totalEntries - totalExits;
}

/**
 * Ajoute un mouvement de stock
 * @param {String} productId - ID du produit
 * @param {String} storeId - ID de la boutique
 * @param {Object} userId - ID de l'utilisateur (depuis req.user)
 * @param {Object} movementData - { isEntry, quantity, name }
 * @returns {Object} - Produit mis à jour
 */
async function addStockMovement(productId, storeId, userId, movementData) {
    // Récupérer le produit
    const product = await Product.findById(productId);
    if (!product) {
        const err = new Error('Produit introuvable');
        err.status = 404;
        throw err;
    }

    // Trouver les données de cette boutique dans le produit
    const storeDataIndex = product.storeData.findIndex(
        sd => sd.storeId.equals(storeId)
    );

    if (storeDataIndex === -1) {
        const err = new Error('Ce produit n\'existe pas dans cette boutique');
        err.status = 404;
        throw err;
    }

    const storeData = product.storeData[storeDataIndex];

    // Si c'est une sortie, vérifier qu'il y a assez de stock
    if (movementData.isEntry === false) {
        const currentStock = calculateCurrentStock(storeData.stockMovements);
        if (currentStock < movementData.quantity) {
            const err = new Error(
                `Stock insuffisant. Stock actuel: ${currentStock}, demandé: ${movementData.quantity}`
            );
            err.status = 400;
            throw err;
        }
    }

    // Créer le mouvement
    const newMovement = {
        movementId: new mongoose.Types.ObjectId(),
        isEntry: movementData.isEntry,
        quantity: movementData.quantity,
        timestamp: new Date(),
        name: movementData.name,
        userId: userId
    };

    // Ajouter le mouvement
    storeData.stockMovements.push(newMovement);

    // Sauvegarder
    await product.save();

    return product;
}

/**
 * Récupère le stock actuel et l'historique des mouvements
 * @param {String} productId - ID du produit
 * @param {String} storeId - ID de la boutique
 * @returns {Object} - { product, store, currentStock, movements }
 */
async function getStockDetails(productId, storeId) {
    const product = await Product.findById(productId);
    if (!product) {
        const err = new Error('Produit introuvable');
        err.status = 404;
        throw err;
    }

    const store = await Store.findById(storeId).populate('userId', 'username email profile');
    if (!store) {
        const err = new Error('Boutique introuvable');
        err.status = 404;
        throw err;
    }

    const storeData = product.storeData.find(
        sd => sd.storeId.toString() === storeId
    );

    if (!storeData) {
        const err = new Error('Ce produit n\'existe pas dans cette boutique');
        err.status = 404;
        throw err;
    }

    const currentStock = calculateCurrentStock(storeData.stockMovements);

    // Récupérer les mouvements avec les infos utilisateurs
    const movementsWithUsers = await Promise.all(
        storeData.stockMovements.map(async (movement) => {
            const User = require('../models/user.model');
            const user = await User.findById(movement.userId).select('username email profile');
            return {
                movementId: movement.movementId,
                type: movement.isEntry ? 'Entrée' : 'Sortie',
                quantity: movement.quantity,
                timestamp: movement.timestamp,
                name: movement.name,
                by: user ? {
                    username: user.username,
                    name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim()
                } : null
            };
        })
    );

    return {
        product: {
            id: product._id,
            name: product.name,
            description: product.description
        },
        store: {
            id: store._id,
            name: store.name,
            address: store.address
        },
        currentStock,
        movements: movementsWithUsers.sort((a, b) => b.timestamp - a.timestamp)
    };
}

/**
 * Récupère le stock de tous les produits d'une boutique
 * @param {String} storeId - ID de la boutique
 * @returns {Array} - Liste des produits avec leur stock
 */
async function getStoreInventory(storeId) {
    const store = await Store.findById(storeId);
    if (!store) {
        const err = new Error('Boutique introuvable');
        err.status = 404;
        throw err;
    }

    // Trouver tous les produits qui ont des données pour cette boutique
    const products = await Product.find({
        'storeData.storeId': storeId
    });

    const inventory = products.map(product => {
        const storeData = product.storeData.find(
            sd => sd.storeId.toString() === storeId
        );

        const currentStock = calculateCurrentStock(storeData.stockMovements);

        return {
            productId: product._id,
            productName: product.name,
            currentStock,
            currentPrice: storeData.currentPrice.toString(),
            lastMovement: storeData.stockMovements.length > 0
                ? storeData.stockMovements[storeData.stockMovements.length - 1].timestamp
                : null
        };
    });

    return {
        store: {
            id: store._id,
            name: store.name
        },
        totalProducts: inventory.length,
        inventory
    };
}

module.exports = {
    calculateCurrentStock,
    addStockMovement,
    getStockDetails,
    getStoreInventory
};