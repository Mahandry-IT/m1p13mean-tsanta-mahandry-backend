const ProductService = require('../services/product.service');
const { success, error } = require('../utils/response');
const Store = require('../models/store.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const {User} = require("../models");

module.exports = {

  // GET /api/products/list — liste boutiques
  async list(req, res) {
    try {
      const result = await ProductService.list();
      return success(res, result);
    } catch (e) {
      return error(res, e.message || 'Erreur récupération produits');
    }
  },

  // GET /api/products
  async listAll(req, res) {
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

  // GET /api/products/my-stores
  async listMyStoresProducts(req, res) {
    try {
      const email = req.user?.email;
      if (!email) return error(res, "Email manquant dans le token", 401);

      // 1) retrouver l'utilisateur via l'email (token)
      const user = await User.findOne({ email }).select('_id');
      if (!user) return error(res, 'Utilisateur introuvable', 404);

      const { page, limit, skip } = getPagination(req.query, { defaultPage: 1, defaultLimit: 20, maxLimit: 100 });

      // filtres
      const storeId = req.query.storeId;
      const q = (req.query.q || '').toString().trim();
      const categoryId = req.query.categoryId;
      const typeId = req.query.typeId;

      // 2) stores possédées
      const ownedStores = await Store.find({ userId: user._id }).select('_id').lean();
      const ownedStoreIds = ownedStores.map((s) => s._id);

      if (ownedStoreIds.length === 0) {
        return success(res, { products: [], pagination: buildPaginationMeta({ total: 0, page, limit }) }, 'Aucune boutique pour cet utilisateur');
      }

      // Filtre boutique spécifique, et on vérifie qu'elle appartient au user
      let storeIdsFilter = ownedStoreIds;
      if (storeId) {
        if (!mongoose.Types.ObjectId.isValid(String(storeId))) {
          return error(res, 'storeId invalide', 400);
        }
        const storeObjId = new mongoose.Types.ObjectId(String(storeId));
        const isOwned = ownedStoreIds.some((id) => String(id) === String(storeObjId));
        if (!isOwned) return error(res, 'Accès refusé à cette boutique', 403);
        storeIdsFilter = [storeObjId];
      }

      // --- Filtres categoryId/typeId (même logique que ProductService.listPaginated)
      const hasCategoryId = Boolean(categoryId);
      const hasTypeId = Boolean(typeId);

      let categoryObjectId;
      let typeObjectId;

      if (hasCategoryId) {
        if (!mongoose.Types.ObjectId.isValid(String(categoryId))) {
          return error(res, 'categoryId invalide', 400);
        }
        categoryObjectId = new mongoose.Types.ObjectId(String(categoryId));
      }

      if (hasTypeId) {
        if (!mongoose.Types.ObjectId.isValid(String(typeId))) {
          return error(res, 'typeId invalide', 400);
        }
        typeObjectId = new mongoose.Types.ObjectId(String(typeId));
      }

      const filter = {
        'storeData.storeId': { $in: storeIdsFilter },
      };

      if (hasCategoryId && hasTypeId) {
        filter.categories = { $elemMatch: { categoryId: categoryObjectId, typeIds: typeObjectId } };
      } else if (hasCategoryId) {
        filter['categories.categoryId'] = categoryObjectId;
      } else if (hasTypeId) {
        filter['categories.typeIds'] = typeObjectId;
      }

      // Recherche full text si q
      const projection = {};
      const sort = {};

      if (q) {
        // NB: ProductService.listPaginated fait une recherche Regex + lookup sur Category/Type.
        // Ici on reste cohérent avec le code existant: $text (name/description). Les filtres categoryId/typeId couvrent déjà les catégories.
        filter.$text = { $search: q };
        projection.score = { $meta: 'textScore' };
        sort.score = { $meta: 'textScore' };
      }

      const sortBy = (req.query.sortBy || 'createdAt').toString();
      const sortDir = String(req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 1 : -1;
      const allowedSortBy = new Set(['createdAt', 'updatedAt', 'name', 'description']);
      sort[allowedSortBy.has(sortBy) ? sortBy : 'createdAt'] = sortDir;
      sort._id = 1;

      const [products, total] = await Promise.all([
        Product.find(filter, Object.keys(projection).length ? projection : undefined)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter),
      ]);

      return success(res, { products, pagination: buildPaginationMeta({ total, page, limit }) }, 'Produits de vos boutiques');
    } catch (e) {
      return error(res, e.message || 'Erreur récupération produits de vos boutiques', e.status || 400);
    }
  },

  // DELETE /api/products/my-stores/:idp/:idb
  async removeMyStoreProduct(req, res) {
    try {
      const email = req.user?.email;
      if (!email) return error(res, 'Email manquant dans le token', 401);

      const user = await User.findOne({ email }).select('_id');
      if (!user) return error(res, 'Utilisateur introuvable', 404);

      const { idp, idb } = req.params;

      // Vérifie que la boutique appartient à l'utilisateur
      const store = await Store.findOne({ _id: idb, userId: user._id }).select('_id').lean();
      if (!store) return error(res, 'Accès refusé à cette boutique', 403);

      const updated = await ProductService.removeStoreData(idp, idb);
      if (!updated) return error(res, 'Produit introuvable', 404);

      return success(res, { id: updated._id, storeId: idb }, 'Relation produit-boutique supprimée');
    } catch (e) {
      return error(res, e.message || 'Erreur suppression produit boutique', e.status || 400);
    }
  },
};
