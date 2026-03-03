const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const FavoriteController = require('../controllers/favorite.controller');
const { favoriteAddSchema, favoriteRemoveParamsSchema } = require('../validators/favorite.validator');

const router = Router();

// Favoris de l'utilisateur connecté
router.get('/me', auth, FavoriteController.listMyFavorites);
router.post('/me', auth, validate.body(favoriteAddSchema), FavoriteController.addMyFavorite);
router.delete('/me/:favoriteId', auth, validate.params(favoriteRemoveParamsSchema), FavoriteController.removeMyFavorite);

module.exports = router;

