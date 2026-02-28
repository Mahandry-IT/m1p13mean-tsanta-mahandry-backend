const RoleService = require('../services/role.service');
const { success, error } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

module.exports = {
  async list(req, res) {
    try {
      const { page, limit } = getPagination(req.query, { defaultPage: 1, defaultLimit: 20, maxLimit: 100 });

      const result = await RoleService.list();

      return success(res, result, 'Rôles récupérés avec succès');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération rôles');
    }
  }
};
