const { Router } = require('express');
const MenuController = require('../controllers/menu.controller');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validation.middleware');

const {
    menuCreateSchema,
    menuUpdateSchema,
    menuIdParamSchema,
    roleIdParamSchema,
    menuListQuerySchema,
    menuListByRoleQuerySchema
} = require('../validators/menu.validator');

const router = Router();

// GET /api/menus/role/:roleId
router.get(
    '/role/:roleId',
    auth,
    validate.params(roleIdParamSchema),
    validate.query(menuListByRoleQuerySchema),
    MenuController.listByRole
);

// POST /api/menus
router.post(
    '/',
    auth,
    authorize('menu:create'),
    validate.body(menuCreateSchema),
    MenuController.create
);

// GET /api/menus
router.get(
    '/',
    auth,
    authorize('menu:list'),
    validate.query(menuListQuerySchema),
    MenuController.list
);

// GET /api/menus/:id
router.get(
    '/:id',
    auth,
    authorize('menu:get'),
    validate.params(menuIdParamSchema),
    MenuController.getById
);

// PUT /api/menus/:id
router.put(
    '/:id',
    auth,
    authorize('menu:update'),
    validate.params(menuIdParamSchema),
    validate.body(menuUpdateSchema),
    MenuController.update
);

// DELETE /api/menus/:id
router.delete(
    '/:id',
    auth,
    authorize('menu:delete'),
    validate.params(menuIdParamSchema),
    MenuController.remove
);

module.exports = router;

