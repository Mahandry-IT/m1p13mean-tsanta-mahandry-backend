const { Router } = require('express');
const UserController = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { userUpdateSchema, userIdParamSchema, userCreatedProfileSchema, checkProfileSchema } = require('../validators/user.validator');
const authorize = require("../middlewares/authorize.middleware");
const { upload } = require('../middlewares/upload.middleware');

const router = Router();

router.get('/', auth, authorize('user:list'), UserController.list);

// Utilisateur courant (email issu du token)
router.get('/me', auth, UserController.getMe);
router.put('/me', auth, upload.single('avatar'), validate.body(userUpdateSchema), UserController.updateMe);

router.post('/profile', auth, upload.single('avatar'), validate.body(userCreatedProfileSchema), UserController.create);
router.post('/check-profile', auth, validate.body(checkProfileSchema), UserController.checkProfile);
router.get('/:id', auth, authorize('user:get'), validate.params(userIdParamSchema), UserController.getById);
router.put('/:id', auth, authorize('user:update'), validate.params(userIdParamSchema), validate.body(userUpdateSchema), UserController.update);
router.delete('/:id', auth, authorize('user:delete'), validate.params(userIdParamSchema), UserController.remove);


module.exports = router;
