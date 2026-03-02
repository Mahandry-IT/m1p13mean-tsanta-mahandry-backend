const { Router } = require('express');
const CategoryController = require('../controllers/category.controller');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validation.middleware');
const { createCategorySchema, updateCategorySchema, idParamSchema } = require('../validators/category.validator');

const router = Router();

router.get('/', auth, authorize('category:view'), CategoryController.list);
router.post('/', auth, authorize('category:manage'), validate.body(createCategorySchema), CategoryController.create);

router.get('/:id', auth, authorize('category:view'), validate.params(idParamSchema), CategoryController.getById);
router.patch('/:id', auth, authorize('category:manage'), validate.params(idParamSchema), validate.body(updateCategorySchema), CategoryController.update);
router.delete('/:id', auth, authorize('category:manage'), validate.params(idParamSchema), CategoryController.remove);

router.get('/:id/types', auth, authorize('type:view'), validate.params(idParamSchema), CategoryController.listTypes);

module.exports = router;

