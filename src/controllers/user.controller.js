const UserService = require('../services/user.service');
const { success, error } = require('../utils/response');

module.exports = {
  async list(req, res) {
    try {
      const users = await UserService.list();
      return success(res, users.map(u => u.toJSON()));
    } catch (e) {
      return error(res, e.message || 'Erreur récupération utilisateurs');
    }
  },
  async getById(req, res) {
    try {
      const user = await UserService.getById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      return success(res, user.toJSON());
    } catch (e) {
      return error(res, e.message || 'Erreur récupération utilisateur');
    }
  },
  async create(req, res) {
    try {
      const userId = req.user?.userId || req.user?._id || req.user?.id;
      const result = await UserService.create(userId, req.body, req.file);
      return success(res, result.toJSON(), 'Création réussie', 201);
    } catch (e) {
      return error(res, e.message || 'Erreur création de profil', e.status || 400);
    }
  },
  async update(req, res) {
    try {
      const user = await UserService.update(req.params.id, req.body);
      if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      return success(res, user.toJSON(), 'Mise à jour réussie');
    } catch (e) {
      return error(res, e.message || 'Erreur mise à jour', e.status || 400);
    }
  },
  async remove(req, res) {
    try {
      const ok = await UserService.remove(req.params.id);
      if (!ok) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      return success(res, null, 'Suppression réussie', 204);
    } catch (e) {
      return error(res, e.message || 'Erreur suppression');
    }
  }
};
