const FavoriteService = require('../services/favorite.service');
const { success, error } = require('../utils/response');

module.exports = {
  async listMyFavorites(req, res) {
    try {
      const meUserId = FavoriteService.getUserIdFromTokenPayload(req.user);
      const favorites = await FavoriteService.listFavorites(meUserId);
      return success(res, { favorites }, 'Favoris récupérés');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération favoris', e.status || 400);
    }
  },

  async addMyFavorite(req, res) {
    try {
      const meUserId = FavoriteService.getUserIdFromTokenPayload(req.user);
      const favorites = await FavoriteService.addFavorite(meUserId, req.body);
      return success(res, { favorites }, 'Favori ajouté', 201);
    } catch (e) {
      return error(res, e.message || 'Erreur ajout favori', e.status || 400);
    }
  },

  async removeMyFavorite(req, res) {
    try {
      const meUserId = FavoriteService.getUserIdFromTokenPayload(req.user);
      const favorites = await FavoriteService.removeFavorite(meUserId, req.params.favoriteId);
      return success(res, { favorites }, 'Favori supprimé');
    } catch (e) {
      return error(res, e.message || 'Erreur suppression favori', e.status || 400);
    }
  },
};

