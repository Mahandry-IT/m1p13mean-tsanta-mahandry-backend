const PromotionService = require('../services/promotion.service');
const { success, error } = require('../utils/response');

module.exports = {
  // POST /api/promotions
  async create(req, res) {
    try {
      const doc = await PromotionService.create(req.body);
      return success(res, doc, 'Promotion créée', 201);
    } catch (e) {
      return error(res, e.message || 'Erreur création promotion', e.status || 400);
    }
  },

  // GET /api/promotions?productId=...&storeId=...
  async list(req, res) {
    try {
      const result = await PromotionService.list(req.query);
      return success(res, result, 'Promotions récupérées');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération promotions', e.status || 400);
    }
  },

  // GET /api/promotions/:promotionId?productId=...&storeId=...
  async getById(req, res) {
    try {
      const doc = await PromotionService.getById({
        productId: req.query.productId,
        storeId: req.query.storeId,
        promotionId: req.params.promotionId,
      });
      return success(res, doc, 'Promotion récupérée');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération promotion', e.status || 400);
    }
  },

  // PATCH /api/promotions/:promotionId
  async update(req, res) {
    try {
      const doc = await PromotionService.update({
        productId: req.body.productId,
        storeId: req.body.storeId,
        promotionId: req.params.promotionId,
        ...req.body,
      });
      return success(res, doc, 'Promotion mise à jour');
    } catch (e) {
      return error(res, e.message || 'Erreur mise à jour promotion', e.status || 400);
    }
  },

  // DELETE /api/promotions/:promotionId
  async remove(req, res) {
    try {
      const doc = await PromotionService.remove({
        productId: req.body.productId,
        storeId: req.body.storeId,
        promotionId: req.params.promotionId,
      });
      return success(res, doc, 'Promotion supprimée');
    } catch (e) {
      return error(res, e.message || 'Erreur suppression promotion', e.status || 400);
    }
  },

  // GET /api/promotions/suggest?storeId=...
  async suggest(req, res) {
    try {
      const doc = await PromotionService.suggestPromotion({ storeId: req.query.storeId });
      return success(res, doc, 'Suggestion de promotion');
    } catch (e) {
      return error(res, e.message || 'Erreur suggestion promotion', e.status || 400);
    }
  },
};

