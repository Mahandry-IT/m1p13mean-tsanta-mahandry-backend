const { Router } = require('express');
const RoleController = require('../controllers/role.controller');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');

const router = Router();

router.get('/list', auth, authorize('role:list'), RoleController.list);

module.exports = router;

