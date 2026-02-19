const StockService = require('../services/stock.service');
const { success, error } = require('../utils/response');

module.exports = {

    // POST /api/stocks/:productId/:storeId/movements
    async addMovement(req, res) {
        try {
            const { productId, storeId } = req.params;
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const movementData = req.body;

            const product = await StockService.addStockMovement(
                productId,
                storeId,
                userId,
                movementData
            );

            return success(
                res,
                { productId: product._id, message: 'Mouvement de stock enregistré' },
                'Mouvement ajouté avec succès',
                201
            );
        } catch (e) {
            return error(res, e.message || 'Erreur ajout mouvement', e.status || 400);
        }
    },

    // GET /api/stocks/:productId/:storeId
    async getDetails(req, res) {
        try {
            const { productId, storeId } = req.params;
            const details = await StockService.getStockDetails(productId, storeId);
            return success(res, details);
        } catch (e) {
            return error(res, e.message || 'Erreur récupération stock', e.status || 400);
        }
    },

    // GET /api/stocks/store/:storeId
    async getStoreInventory(req, res) {
        try {
            const { storeId } = req.params;
            const inventory = await StockService.getStoreInventory(storeId);
            return success(res, inventory);
        } catch (e) {
            return error(res, e.message || 'Erreur récupération inventaire', e.status || 400);
        }
    }
};