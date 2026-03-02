const StoreService = require('../services/store.service');
const { success, error } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

module.exports = {

    // POST /api/stores/request — demande boutique
    async request(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const store = await StoreService.requestStore(userId, req.body);
            return success(res, store.toJSON(), 'Demande de boutique envoyée avec succès', 201);
        } catch (e) {
            return error(res, e.message || 'Erreur lors de la demande', e.status || 400);
        }
    },

    // GET /api/stores — liste boutiques avec filtres
    async listAll(req, res) {
        try {
            const { page, limit } = getPagination(req.query, { defaultPage: 1, defaultLimit: 20, maxLimit: 100 });
            const filters = {
                status: req.query.status,
                isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
                page,
                limit
            };
            const result = await StoreService.listAll(filters);
            return success(res, {
                stores: result.stores.map(s => s.toJSON()),
                pagination: result.pagination
            });
        } catch (e) {
            return error(res, e.message || 'Erreur récupération boutiques');
        }
    },

    // GET /api/stores/list — liste boutiques
    async list(req, res) {
        try {

            const result = await StoreService.list();
            return success(res, result);
        } catch (e) {
            return error(res, e.message || 'Erreur récupération boutiques');
        }
    },

    // GET /api/stores/my — mes boutiques
    async listMine(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;

            const { page, limit } = getPagination(req.query, {
                defaultPage: 1,
                defaultLimit: 20,
                maxLimit: 100
            });

            const result = await StoreService.listByUser(userId, { page, limit });

            return success(res, {
                stores: result.stores.map(s => s.toJSON()),
                pagination: result.pagination
            });

        } catch (e) {
            return error(res, e.message || 'Erreur récupération de vos boutiques');
        }
    },

    // GET /api/stores/:id — détail d'une boutique
    async getById(req, res) {
        try {
            const store = await StoreService.getById(req.params.id);
            if (!store) return res.status(404).json({ success: false, message: 'Boutique introuvable' });
            return success(res, store.toJSON());
        } catch (e) {
            return error(res, e.message || 'Erreur récupération boutique');
        }
    },

    // PATCH /api/stores/:id/activate — activer boutique
    async activate(req, res) {
        try {
            const store = await StoreService.activate(req.params.id);
            return success(res, store.toJSON(), 'Boutique activée avec succès');
        } catch (e) {
            return error(res, e.message || 'Erreur activation boutique', e.status || 400);
        }
    },

    // PATCH /api/stores/:id/deactivate — désactiver boutique
    async deactivate(req, res) {
        try {
            const store = await StoreService.deactivate(req.params.id);
            return success(res, store.toJSON(), 'Boutique désactivée avec succès');
        } catch (e) {
            return error(res, e.message || 'Erreur désactivation boutique', e.status || 400);
        }
    },

    // PUT /api/stores/:id
    async update(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const storeId = req.params.id;
            const store = await StoreService.updateStore(userId, storeId, req.body);
            return success(res, store.toJSON(), 'Boutique modifiée avec succès');
        } catch (e) {
            return error(res, e.message || 'Erreur modification boutique', e.status || 400);
        }
    },

    // PATCH /api/stores/:id/reject — rejeter boutique
    async reject(req, res) {
        try {
            const store = await StoreService.reject(req.params.id);
            return success(res, store.toJSON(), 'Boutique rejetée avec succès');
        } catch (e) {
            return error(res, e.message || 'Erreur rejet boutique', e.status || 400);
        }
    }
};