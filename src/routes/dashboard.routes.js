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
const storeIdParamSchema = Joi.object({
    storeId: Joi.string().required()
});

const dateRangeQuerySchema = Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
}).unknown(true);

// Dashboard Admin
router.get(
    '/admin',
    auth,
    authorize('dashboard:admin'),
    validate.query(dateRangeQuerySchema),
    adminDashboardController.getDashboard
);

// Dashboard Manager
router.get(
    '/manager/:storeId',
    auth,
    authorize('dashboard:manager'),
    validate.params(storeIdParamSchema),
    validate.query(dateRangeQuerySchema),
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