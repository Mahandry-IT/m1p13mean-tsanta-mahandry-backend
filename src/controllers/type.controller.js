const TypeService = require('../services/type.service');
const { success, error } = require('../utils/response');

module.exports = {
  // POST /api/types
  async create(req, res) {
    try {
      const type = await TypeService.create(req.body);
      return success(res, type, 'Type créé', 201);
    } catch (e) {
      return error(res, e.message || 'Erreur création type', e.status || 400);
    }
  },

  // GET /api/types
  async list(req, res) {
    try {
      const result = await TypeService.list(req.query);
      return success(res, result, 'Types récupérés');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération types', e.status || 400);
    }
  },

  // GET /api/types/:id
  async getById(req, res) {
    try {
      const type = await TypeService.getById(req.params.id);
      if (!type) return error(res, 'Type introuvable', 404);
      return success(res, type);
    } catch (e) {
      return error(res, e.message || 'Erreur récupération type', e.status || 400);
    }
  },

  // PATCH /api/types/:id
  async update(req, res) {
    try {
      const type = await TypeService.update(req.params.id, req.body);
      if (!type) return error(res, 'Type introuvable', 404);
      return success(res, type, 'Type mis à jour');
    } catch (e) {
      return error(res, e.message || 'Erreur mise à jour type', e.status || 400);
    }
  },

  // DELETE /api/types/:id
  async remove(req, res) {
    try {
      const type = await TypeService.remove(req.params.id);
      if (!type) return error(res, 'Type introuvable', 404);
      return success(res, { id: type._id }, 'Type supprimé');
    } catch (e) {
      return error(res, e.message || 'Erreur suppression type', e.status || 400);
    }
  },
};

