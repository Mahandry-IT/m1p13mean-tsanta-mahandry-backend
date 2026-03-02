const { Router } = require('express');
const StoreController = require('../controllers/store.controller');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validation.middleware');
const {
    storeRequestSchema,
    storeIdParamSchema,
    storeListQuerySchema
} = require('../validators/store.validator');

const router = Router();

// demande boutique
router.post(
    '/request',
    auth,
    authorize('store:request'),
    validate.body(storeRequestSchema),
    StoreController.request
);

// mes boutiques
router.get(
    '/my',
    auth,
    authorize('store:list_own'),
    StoreController.listMine
);

// liste toutes les boutiques avec filtres
router.get(
    '/',
    auth,
    authorize('store:list'),
    validate.query(storeListQuerySchema),
    StoreController.listAll
);

// détail d'une boutique
router.get(
    '/:id',
    auth,
    authorize('store:get'),
    validate.params(storeIdParamSchema),
    StoreController.getById
);

//activer une boutique
router.patch(
    '/:id/activate',
    auth,
    authorize('store:activate'),
    validate.params(storeIdParamSchema),
    StoreController.activate
);

// désactiver une boutique
router.patch(
    '/:id/deactivate',
    auth,
    authorize('store:deactivate'),
    validate.params(storeIdParamSchema),
    StoreController.deactivate
);

// modifier
router.put(
    '/:id',
    auth, // authentifie l'utilisateur
    StoreController.update
);

// rejeter
router.patch(
    '/:id/reject', 
    auth, 
    authorize('store:reject'), 
    validate.params(storeIdParamSchema),
    StoreController.reject
);

module.exports = router;