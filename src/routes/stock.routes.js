const { Router } = require('express');
const StockController = require('../controllers/stock.controller');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validation.middleware');
const {
    stockMovementSchema,
    stockParamsSchema,
    storeIdParamSchema
} = require('../validators/stock.validator');

const router = Router();

// Ajouter un mouvement de stock 
router.post(
    '/:productId/:storeId/movements',
    auth,
    authorize('stock:add_movement'),
    validate.params(stockParamsSchema),
    validate.body(stockMovementSchema),
    StockController.addMovement
);

// Voir le stock d'un produit dans une boutique
router.get(
    '/:productId/:storeId',
    auth,
    authorize('stock:view'),
    validate.params(stockParamsSchema),
    StockController.getDetails
);

// Voir l'inventaire complet d'une boutique
router.get(
    '/store/:storeId',
    auth,
    authorize('stock:view'),
    validate.params(storeIdParamSchema),
    StockController.getStoreInventory
);

module.exports = router;