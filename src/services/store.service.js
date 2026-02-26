const Store = require('../models/store.model');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

// Créer une boutique 
async function requestStore(userId, data) {
    // Vérifier si cet utilisateur a déjà une boutique pending ou approved
    const existing = await Store.findOne({
        userId,
        status: { $in: ['pending', 'approved'] }
    });
    if (existing) {
        const err = new Error('Vous avez déjà une boutique en cours ou approuvée');
        err.status = 409;
        throw err;
    }

    const store = new Store({
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        userId,
        isActive: false,
        status: 'pending'
    });

    await store.save();
    return store;
}

// Lister toutes les boutiques 
async function listAll(filters = {}) {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const { page, limit, skip } = getPagination(filters, { defaultPage: 1, defaultLimit: 20, maxLimit: 100 });

    const [stores, total] = await Promise.all([
        Store.find(query)
            .populate('userId', 'username email profile')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Store.countDocuments(query)
    ]);

    return {
        stores,
        pagination: buildPaginationMeta({ total, page, limit })
    };
}

// Lister mes boutiques 
async function listByUser(userId) {
    const stores = await Store.find({ userId }).sort({ createdAt: -1 });
    return stores;
}

//boutique by id
async function getById(id) {
    const store = await Store.findById(id).populate('userId', 'username email profile');
    return store;
}

// Activer une boutique
async function activate(id) {
    const store = await Store.findById(id);
    if (!store) {
        const err = new Error('Boutique introuvable');
        err.status = 404;
        throw err;
    }
    if (store.status === 'approved' && store.isActive) {
        const err = new Error('La boutique est déjà active');
        err.status = 409;
        throw err;
    }

    store.status = 'approved';
    store.isActive = true;
    await store.save();
    return store;
}

// Désactiver une boutique
async function deactivate(id) {
    const store = await Store.findById(id);
    if (!store) {
        const err = new Error('Boutique introuvable');
        err.status = 404;
        throw err;
    }
    if (!store.isActive) {
        const err = new Error('La boutique est déjà inactive');
        err.status = 409;
        throw err;
    }

    store.isActive = false;
    await store.save();
    return store;
}

module.exports = {
    requestStore,
    listAll,
    listByUser,
    getById,
    activate,
    deactivate
};