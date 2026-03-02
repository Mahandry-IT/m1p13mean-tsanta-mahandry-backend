const { Router } = require('express');
const ProductController = require('../controllers/product.controller');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validation.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { createProductSchema, updateProductSchema, idParamSchema, listQuerySchema } = require('../validators/product.validator');
const { myStoresProductsQuerySchema } = require('../validators/product.mystores.validator');

const router = Router();

// Listing paginé + recherche
router.get('/', auth, authorize('product:view'), validate.query(listQuerySchema), ProductController.list);

// Produits de toutes mes boutiques (owner)
router.get('/my-stores', auth, authorize('product:manage'), validate.query(myStoresProductsQuerySchema), ProductController.listMyStoresProducts);

router.get('/:id', auth, authorize('product:view'), validate.params(idParamSchema), ProductController.getById);
router.post('/', auth, authorize('product:manage'), upload.array('images', 10), validate.body(createProductSchema), ProductController.create);

router.patch('/:id', auth, authorize('product:manage'), upload.array('images', 10), validate.params(idParamSchema), validate.body(updateProductSchema), ProductController.update);

router.delete('/:id', auth, authorize('product:manage'), validate.params(idParamSchema), ProductController.remove);

module.exports = router;
