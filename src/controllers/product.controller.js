const ProductService = require('../services/product.service');
const { success, error } = require('../utils/response');

module.exports = {
  // GET /api/products
  async list(req, res) {
    try {
      const result = await ProductService.listPaginated(req.query);
      return success(res, result, 'Produits récupérés');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération produits', e.status || 400);
    }
  },

  // GET /api/products/:id
  async getById(req, res) {
    try {
      const doc = await ProductService.getById(req.params.id);
      if (!doc) return error(res, 'Produit introuvable', 404);
      return success(res, doc);
    } catch (e) {
      return error(res, e.message || 'Erreur récupération produit', e.status || 400);
    }
  },

  // POST /api/products
  async create(req, res) {
    try {
      const doc = await ProductService.create(req.body, req.files);
      return success(res, doc, 'Produit créé', 201);
    } catch (e) {
      return error(res, e.message || 'Erreur création produit', e.status || 400);
    }
  },

  // PATCH /api/products/:id
  async update(req, res) {
    try {
      const doc = await ProductService.update(req.params.id, req.body, req.files);
      if (!doc) return error(res, 'Produit introuvable', 404);
      return success(res, doc, 'Produit mis à jour');
    } catch (e) {
      return error(res, e.message || 'Erreur mise à jour produit', e.status || 400);
    }
  },

  // DELETE /api/products/:id
  async remove(req, res) {
    try {
      const doc = await ProductService.remove(req.params.id);
      if (!doc) return error(res, 'Produit introuvable', 404);
      return success(res, { id: doc._id }, 'Produit supprimé');
    } catch (e) {
      return error(res, e.message || 'Erreur suppression produit', e.status || 400);
    }
  },
};
