const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const OrderPDFController = require('../controllers/orderPDF.controller');

const router = Router();

// GET /api/orders/:orderId/pdf?type=order|receipt
router.get('/:orderId/pdf', auth, authorize('order:view'), OrderPDFController.downloadOrderPDF);

module.exports = router;