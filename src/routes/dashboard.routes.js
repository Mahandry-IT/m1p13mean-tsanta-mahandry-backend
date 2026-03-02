const { Router } = require('express');
const adminDashboardController = require('../controllers/admin-dashboard.controller');
const managerDashboardController = require('../controllers/manager-dashboard.controller');
const customerDashboardController = require('../controllers/customer-dashboard.controller');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validation.middleware');
const Joi = require('joi');

const router = Router();

// Validation schemas
const dateRangeQuerySchema = Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    storeId: Joi.string().optional()  // Pour le filtre optionnel par boutique
}).unknown(true);

// Schema pour les paramètres optionnels du manager
const managerQuerySchema = Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    storeId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional().messages({
        'string.pattern.base': 'storeId doit être un ObjectId valide'
    })
}).unknown(true);

// Dashboard Admin
router.get(
    '/admin',
    auth,
    authorize('dashboard:admin'),
    validate.query(dateRangeQuerySchema),
    adminDashboardController.getDashboard
);

// Dashboard Manager - Vue globale de toutes les boutiques du manager
router.get(
    '/manager',
    auth,
    authorize('dashboard:manager'),
    validate.query(managerQuerySchema),
    managerDashboardController.getDashboard
);

// Dashboard Client
router.get(
    '/customer',
    auth,
    authorize('dashboard:customer'),
    validate.query(dateRangeQuerySchema),
    customerDashboardController.getDashboard
);

module.exports = router;