const { Router } = require('express');
const PromotionController = require('../controllers/promotion.controller');
const auth = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validation.middleware');
const {
  createPromotionSchema,
  updatePromotionSchema,
  removePromotionSchema,
  promotionIdParamSchema,
  listPromotionsQuerySchema,
  getPromotionQuerySchema,
  suggestPromotionQuerySchema
} = require('../validators/promotion.validator');

const router = Router();

// Suggestion promotion (non persistée)
router.get('/suggest', auth, authorize('promotion:manage'), validate.query(suggestPromotionQuerySchema), PromotionController.suggest);

// CRUD promotions - réservé manager (via feature)
router.get('/', auth, authorize('promotion:manage'), validate.query(listPromotionsQuerySchema), PromotionController.list);
router.get('/:promotionId', auth, authorize('promotion:manage'), validate.params(promotionIdParamSchema), validate.query(getPromotionQuerySchema), PromotionController.getById);
router.post('/', auth, authorize('promotion:manage'), validate.body(createPromotionSchema), PromotionController.create);
router.patch('/:promotionId', auth, authorize('promotion:manage'), validate.params(promotionIdParamSchema), validate.body(updatePromotionSchema), PromotionController.update);
router.delete('/:promotionId', auth, authorize('promotion:manage'), validate.params(promotionIdParamSchema), validate.body(removePromotionSchema), PromotionController.remove);

module.exports = router;
