const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const storeRoutes = require('./store.routes');
const stockRoutes = require('./stock.routes');
const menuRoutes = require('./menu.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/stores', storeRoutes);
router.use('/stocks', stockRoutes);
router.use('/menus', menuRoutes);

module.exports = router;
