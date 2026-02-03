const { Router } = require('express');
const UserController = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { userUpdateSchema, userIdParamSchema } = require('../validators/user.validator');

const router = Router();

router.get('/', auth, UserController.list);
router.get('/:id', auth, validate.params(userIdParamSchema), UserController.getById);
router.put('/:id', auth, validate.params(userIdParamSchema), validate.body(userUpdateSchema), UserController.update);
router.patch('/:id', auth, validate.params(userIdParamSchema), validate.body(userUpdateSchema), UserController.update);
router.delete('/:id', auth, validate.params(userIdParamSchema), UserController.remove);

module.exports = router;
