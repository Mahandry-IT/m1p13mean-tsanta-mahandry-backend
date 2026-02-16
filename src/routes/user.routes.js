const { Router } = require('express');
const UserController = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { userUpdateSchema, userIdParamSchema, userCreatedProfileSchema } = require('../validators/user.validator');
const authorize = require("../middlewares/authorize.middleware");
const { upload } = require('../middlewares/upload.middleware');

const router = Router();

router.get('/', auth, authorize('user:list'), UserController.list);
router.post('/profile', auth, upload.single('avatar'), validate.body(userCreatedProfileSchema), UserController.create);
router.get('/:id', auth, authorize('user:get'), validate.params(userIdParamSchema), UserController.getById);
router.put('/:id', auth, authorize('user:update'), validate.params(userIdParamSchema), validate.body(userUpdateSchema), UserController.update);
router.delete('/:id', auth, authorize('user:delete'), validate.params(userIdParamSchema), UserController.remove);


module.exports = router;
