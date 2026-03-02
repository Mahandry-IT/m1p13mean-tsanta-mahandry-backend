const { Router } = require('express');
const OrderController = require('../controllers/order.controller');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validation.middleware');
const { addToCartSchema, orderIdParamSchema } = require('../validators/order.validator');
const Joi = require('joi');
const router = Router();

// Ajouter un produit au panier
router.post(
    '/add-to-cart',
    auth,
    authorize('order:add'),
    validate.body(addToCartSchema),
    OrderController.addToCart
);

// Récupérer le panier
router.get(
    '/cart',
    auth,
    authorize('order:view'),
    OrderController.getCart
);

// Supprimer un produit du panier
router.delete(
  '/:orderId/items/:productId/:storeId',
  (req, res, next) => {
    console.log('🔵 Route - req.params:', req.params);
    next();
  },
  auth,
  authorize('order:cancel'),
  OrderController.removeItemFromCart
);


// Annuler un panier entier (status = pending)
router.delete(
    '/:orderId/cancel-cart',
    auth,
    authorize('order:cancel'), // même permission que pour annuler une commande
    validate.params(orderIdParamSchema),
    OrderController.cancelCart
);


// Confirmer une commande
router.post(
    '/:orderId/confirm',
    auth,
    authorize('order:confirm'),
    validate.params(orderIdParamSchema),
    OrderController.confirmOrder
);

// Annuler commande
router.patch(
    '/:orderId/cancel',
    auth,
    authorize('order:cancel'),
    OrderController.cancelOrder
);

// Mes commandes
router.get(
    '/my',
    auth,
    authorize('order:list_own'),
    OrderController.listMyOrders
);

// Détail commande
router.get(
    '/:orderId',
    auth,
    authorize('order:get'),
    OrderController.getOrderDetail
);

router.patch(
    '/:orderId/status',
    auth,
    authorize('order:update_status'),
    validate.params(orderIdParamSchema),
    validate.body(Joi.object({ status: Joi.string().valid('shipped', 'delivered', 'received', 'cancelled').required() })),
    OrderController.updateStatus
);

module.exports = router;