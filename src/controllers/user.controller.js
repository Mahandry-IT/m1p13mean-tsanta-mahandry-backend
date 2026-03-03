const UserService = require('../services/user.service');
const { success, error } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

module.exports = {
  async list(req, res) {
    try {
      const { page, limit } = getPagination(req.query, { defaultPage: 1, defaultLimit: 20, maxLimit: 100 });
      const filters = {
        page,
        limit,
        status: req.query.status,
        roleId: req.query.roleId,
        q: req.query.q,
      };

      const result = await UserService.listPaginated(filters);
      return success(res, {
        users: result.users.map(u => u.toJSON()),
        pagination: result.pagination
      });
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
  async checkProfile(req, res) {
    try {
      const result = await UserService.checkProfile(req.body);
      return success(res, result, 'Vous possédez déjà un profil');
    } catch (e){
      return error(res, e.message || 'Erreur vérification de profil', e.status || 400);
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
  async updateMe(req, res) {
    try {
      const email = req.user?.email;
      if (!email) return error(res, 'Email manquant dans le token', 401);

      const user = await UserService.updateByEmail(email, req.body, req.file);
      if (!user) return error(res, 'Utilisateur introuvable', 404);
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
  },
  async getMe(req, res) {
    try {
      const email = req.user?.email;
      if (!email) return error(res, 'Email manquant dans le token', 401);

      const user = await UserService.getByEmail(email);
      if (!user) return error(res, 'Utilisateur introuvable', 404);

      return success(res, user.toJSON(), 'Utilisateur récupéré');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération utilisateur', e.status || 400);
    }
  }
};
