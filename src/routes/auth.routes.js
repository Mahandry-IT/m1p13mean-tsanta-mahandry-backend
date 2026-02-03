const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');
const validate = require('../middlewares/validation.middleware');
const { registerSchema, loginSchema } = require('../validators/user.validator');

const router = Router();

router.post('/register', validate.body(registerSchema), AuthController.register);
router.post('/login', validate.body(loginSchema), AuthController.login);

module.exports = router;
