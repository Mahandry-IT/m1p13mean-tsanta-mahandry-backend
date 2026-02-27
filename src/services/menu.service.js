const Menu = require('../models/menu.model');

// Projection pour ne pas renvoyer de données sensibles/inutiles dans les listes
const LIST_PROJECTION = { permissions: 0 };

function normalizeMongoError(e) {
    // Erreur d'unicité (label/path)
    if (e && (e.code === 11000 || e.code === 11001)) {
        const fields = e.keyPattern ? Object.keys(e.keyPattern) : [];
        const err = new Error(`Conflit d'unicité sur: ${fields.join(', ') || 'champ unique'}`);
        err.status = 409;
        err.details = e.keyValue;
        return err;
    }
    return e;
}

async function create(data) {
    try {
        const menu = await Menu.create(data);
        return menu;
    } catch (e) {
        throw normalizeMongoError(e);
    }
}

async function list(filters = {}) {
    const query = {};

    if (filters.parentId !== undefined) {
        query.parentId = filters.parentId;
    }

    if (filters.roleId) {
        query['permissions.roles'] = filters.roleId;
    }

    const sort = {};
    sort.parentId = 1;
    sort.order = 1;
    sort.label = 1;

    return Menu.find(query, LIST_PROJECTION).sort(sort);
}

async function getById(id) {
    return Menu.findById(id);
}

async function updateById(id, data) {
    try {
        const menu = await Menu.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        if (!menu) {
            const err = new Error('Menu introuvable');
            err.status = 404;
            throw err;
        }
        return menu;
    } catch (e) {
        throw normalizeMongoError(e);
    }
}

async function deleteById(id) {
    const menu = await Menu.findByIdAndDelete(id);
    if (!menu) {
        const err = new Error('Menu introuvable');
        err.status = 404;
        throw err;
    }
    return menu;
}

async function listByRole(roleId, options = {}) {
    const query = { 'permissions.roles': roleId };

    if (options.parentId !== undefined) {
        query.parentId = options.parentId;
    }

    return Menu.find(query, LIST_PROJECTION).sort({ parentId: 1, order: 1, label: 1 });
}

module.exports = {
    create,
    list,
    getById,
    updateById,
    deleteById,
    listByRole
};
