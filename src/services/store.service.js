const Store = require('../models/store.model');

// Créer une boutique 
async function requestStore(userId, data) {

    const store = new Store({
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        userId,
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

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

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
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}


// Lister mes boutiques 
async function listByUser(userId, filters = {}) {
    const query = { userId };

    const { page, limit, skip } = getPagination(filters, {
        defaultPage: 1,
        defaultLimit: 20,
        maxLimit: 100
    });

    const [stores, total] = await Promise.all([
        Store.find(query)
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

    if (store.status === 'active') {
        const err = new Error('La boutique est déjà active');
        err.status = 409;
        throw err;
    }

    if (store.status === 'rejected') {
        const err = new Error('Impossible d’activer une boutique rejetée');
        err.status = 400;
        throw err;
    }

    store.status = 'active';
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

    if (store.status !== 'active') {
        const err = new Error('Seule une boutique active peut être désactivée');
        err.status = 409;
        throw err;
    }

    store.status = 'inactive';
    await store.save();
    return store;
}

// Modifier une boutique
async function updateStore(userId, storeId, data) {
    const store = await Store.findById(storeId);
    if (!store) {
        const err = new Error('Boutique introuvable');
        err.status = 404;
        throw err;
    }

    if (store.userId.toString() !== userId.toString()) {
        const err = new Error('Non autorisé');
        err.status = 403;
        throw err;
    }

    if (store.status === 'active') {
        const err = new Error('Impossible de modifier une boutique active');
        err.status = 400;
        throw err;
    }

    const updatableFields = ['name', 'address', 'phone', 'email'];
    updatableFields.forEach(field => {
        if (data[field] !== undefined) store[field] = data[field];
    });

    // 🔥 Si elle était rejetée → nouvelle soumission
    if (store.status === 'rejected') {
        store.status = 'pending';
    }

    await store.save();
    return store;
}

// Rejeter une boutique
async function reject(id) {
    const store = await Store.findById(id);

    if (!store) {
        const err = new Error('Boutique introuvable');
        err.status = 404;
        throw err;
    }

    if (store.status !== 'pending') {
        const err = new Error('Seule une boutique en attente peut être rejetée');
        err.status = 409;
        throw err;
    }

    store.status = 'rejected';
    await store.save();

    return store;
}

module.exports = {
    requestStore,
    listAll,
    listByUser,
    getById,
    activate,
    deactivate,
    updateStore,
    reject
};