const { Router } = require('express');
const TypeController = require('../controllers/type.controller');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validation.middleware');
const { createTypeSchema, updateTypeSchema, idParamSchema } = require('../validators/type.validator');

const router = Router();

router.get('/', auth, authorize('type:view'), TypeController.list);
router.post('/', auth, authorize('type:manage'), validate.body(createTypeSchema), TypeController.create);

router.get('/:id', auth, authorize('type:view'), validate.params(idParamSchema), TypeController.getById);
router.patch('/:id', auth, authorize('type:manage'), validate.params(idParamSchema), validate.body(updateTypeSchema), TypeController.update);
router.delete('/:id', auth, authorize('type:manage'), validate.params(idParamSchema), TypeController.remove);

module.exports = router;

