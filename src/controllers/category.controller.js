const CategoryService = require('../services/category.service');
const TypeService = require('../services/type.service');
const { success, error } = require('../utils/response');

module.exports = {
  // POST /api/categories
  async create(req, res) {
    try {
      const category = await CategoryService.create(req.body);
      return success(res, category, 'Catégorie créée', 201);
    } catch (e) {
      return error(res, e.message || 'Erreur création catégorie', e.status || 400);
    }
  },

  // GET /api/categories
  async list(req, res) {
    try {
      const result = await CategoryService.list();
      return success(res, result, 'Catégories récupérées');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération catégories', e.status || 400);
    }
  },

  // GET /api/categories
  async listAll(req, res) {
    try {
      const result = await CategoryService.listAll(req.query);
      return success(res, result, 'Catégories récupérées');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération catégories', e.status || 400);
    }
  },

  // GET /api/categories/:id
  async getById(req, res) {
    try {
      const category = await CategoryService.getById(req.params.id);
      if (!category) return error(res, 'Catégorie introuvable', 404);
      return success(res, category);
    } catch (e) {
      return error(res, e.message || 'Erreur récupération catégorie', e.status || 400);
    }
  },

  // PATCH /api/categories/:id
  async update(req, res) {
    try {
      const category = await CategoryService.update(req.params.id, req.body);
      if (!category) return error(res, 'Catégorie introuvable', 404);
      return success(res, category, 'Catégorie mise à jour');
    } catch (e) {
      return error(res, e.message || 'Erreur mise à jour catégorie', e.status || 400);
    }
  },

  // DELETE /api/categories/:id
  async remove(req, res) {
    try {
      const category = await CategoryService.remove(req.params.id);
      if (!category) return error(res, 'Catégorie introuvable', 404);
      return success(res, { id: category._id }, 'Catégorie supprimée');
    } catch (e) {
      return error(res, e.message || 'Erreur suppression catégorie', e.status || 400);
    }
  },

  // GET /api/categories/:id/types
  async listTypes(req, res) {
    try {
      const result = await TypeService.listByCategory(req.params.id, req.query);
      return success(res, result, 'Types récupérés');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération types', e.status || 400);
    }
  },
};

