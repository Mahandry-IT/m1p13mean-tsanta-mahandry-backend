const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');
const validate = require('../middlewares/validation.middleware');
const { registerSchema, loginSchema, passwordChangeSchema, passwordResetSchema, activationSchema } = require('../validators/auth.validator');

const router = Router();

router.post('/register/manager', validate.body(registerSchema), AuthController.registerManager);
router.post('/register/user', validate.body(registerSchema), AuthController.registerUser);
router.post('/login', validate.body(loginSchema), AuthController.login);
router.get("/activate/:token", validate.body(activationSchema), AuthController.activate);
router.post('/reset-password', validate.body(passwordResetSchema), AuthController.resetPassword);
router.post('/change-password', validate.body(passwordChangeSchema), AuthController.changePassword);

module.exports = router;
