const OrderService = require('../services/order.service');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

module.exports = {

    // POST /api/orders/add-to-cart — ajouter produit au panier
    async addToCart(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const { productId, storeId, quantity } = req.body;

            const order = await OrderService.addToCart(userId, { productId, storeId, quantity });

            return success(res, order, 'Produit ajouté au panier', 201);
        } catch (e) {
            return error(res, e.message || 'Erreur ajout au panier', e.status || 400);
        }
    },

    // GET /api/orders/cart — récupérer le panier en cours (draft)
    async getCart(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;

            const order = await OrderService.getCart(userId);

            return success(res, order || null, 'Panier récupéré');
        } catch (e) {
            return error(res, e.message || 'Erreur récupération panier', e.status || 400);
        }
    },

    // DELETE /api/orders/:orderId/items/:productId/:storeId — supprimer un produit du panier
    async removeItemFromCart(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const { orderId, productId, storeId } = req.params;
            const order = await OrderService.removeItemFromCart(orderId, userId, productId, storeId);

            return success(res, order, 'Produit supprimé du panier');
        } catch (e) {
            return error(res, e.message || 'Erreur suppression produit du panier', e.status || 400);
        }
    },



    // DELETE /api/orders/:orderId/cancel-cart — annuler le panier entier
    async cancelCart(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const { orderId } = req.params;

            const result = await OrderService.cancelCart(orderId, userId);
            return success(res, result, 'Panier annulé avec succès');
        } catch (e) {
            return error(res, e.message || 'Erreur annulation panier', e.status || 400);
        }
    },


    // POST /api/orders/:orderId/confirm — confirmer la commande
    async confirmOrder(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const orderId = req.params.orderId;
            const order = await OrderService.confirmOrder(orderId, userId);
            return success(res, order, 'Commande confirmée avec succès', 200);
        } catch (e) {
            return error(res, e.message || 'Erreur confirmation commande', e.status || 400);
        }
    },

    // PATCH /api/orders/:orderId/cancel
    async cancelOrder(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const orderId = req.params.orderId;

            const order = await OrderService.cancelOrder(orderId, userId);
            return success(res, order, 'Commande annulée avec succès', 200);
        } catch (e) {
            return error(res, e.message || 'Erreur annulation commande', e.status || 400);
        }
    },    // GET /api/orders/my — mes commandes (Customer)
    async listMyOrders(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const result = await OrderService.listUserOrders(userId, { page, limit });
            return success(res, result, 'Liste de vos commandes récupérée');
        } catch (e) {
            return error(res, e.message || 'Erreur récupération commandes', e.status || 400);
        }
    },    // GET /api/orders/all — toutes les commandes des boutiques du Manager
    async listAllOrders(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status || null;

            const result = await OrderService.listOrdersByManager(userId, { page, limit, status });
            return success(res, result, 'Liste des commandes récupérée');
        } catch (e) {
            return error(res, e.message || 'Erreur récupération commandes', e.status || 400);
        }
    },

    async getOrderDetail(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const orderId = req.params.orderId;

            const order = await OrderService.getOrderById(orderId, userId);
            return success(res, order, 'Détail de la commande');
        } catch (e) {
            return error(res, e.message || 'Erreur récupération commande', e.status || 400);
        }
    },

    async updateStatus(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const { orderId } = req.params;
            const { status } = req.body;

            const order = await OrderService.updateOrderStatus(orderId, status, userId);
            return success(res, order, `Commande mise à jour à ${status}`);
        } catch (e) {
            return error(res, e.message || 'Erreur mise à jour statut', e.status || 400);
        }
    }

};