const mongoose = require('mongoose');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Store = require('../models/store.model');

function getUserIdFromTokenPayload(payload) {
  return payload?.userId || payload?._id || payload?.id || null;
}

async function listFavorites(meUserId) {
  const user = await User.findById(meUserId).lean(false);
  if (!user) {
    const err = new Error('Utilisateur introuvable');
    err.status = 404;
    throw err;
  }
  return user.favorites || [];
}

async function addFavorite(meUserId, { productId, storeId }) {
  if (!meUserId) {
    const err = new Error('Utilisateur non authentifié');
    err.status = 401;
    throw err;
  }
  if (!productId) {
    const err = new Error('productId manquant');
    err.status = 400;
    throw err;
  }
  if (!storeId || !mongoose.Types.ObjectId.isValid(String(storeId))) {
    const err = new Error('storeId invalide');
    err.status = 400;
    throw err;
  }

  const [product, store] = await Promise.all([
    Product.findById(String(productId)).select('_id storeData.storeId').lean(),
    Store.findById(new mongoose.Types.ObjectId(String(storeId))).select('_id status').lean(),
  ]);

  if (!product) {
    const err = new Error('Produit introuvable');
    err.status = 404;
    throw err;
  }
  if (!store) {
    const err = new Error('Boutique introuvable');
    err.status = 404;
    throw err;
  }
  if (store.status !== 'active') {
    const err = new Error('Boutique inactive');
    err.status = 400;
    throw err;
  }

  // Option: forcer que le produit est vendable dans cette boutique
  const sellableInStore = (product.storeData || []).some((sd) => String(sd.storeId) === String(storeId));
  if (!sellableInStore) {
    const err = new Error('Ce produit n\'est pas disponible dans cette boutique');
    err.status = 400;
    throw err;
  }

  const user = await User.findById(meUserId);
  if (!user) {
    const err = new Error('Utilisateur introuvable');
    err.status = 404;
    throw err;
  }

  user.favorites = Array.isArray(user.favorites) ? user.favorites : [];

  // Empêcher les doublons (même productId + storeId)
  const exists = user.favorites.some((f) => String(f.productId) === String(productId) && String(f.storeId) === String(storeId));
  if (exists) {
    return user.favorites;
  }

  user.favorites.push({
    favoriteId: new mongoose.Types.ObjectId(),
    productId: String(productId),
    storeId: new mongoose.Types.ObjectId(String(storeId)),
    createdAt: new Date(),
  });

  await user.save();
  return user.favorites;
}

async function removeFavorite(meUserId, favoriteId) {
  if (!meUserId) {
    const err = new Error('Utilisateur non authentifié');
    err.status = 401;
    throw err;
  }
  if (!favoriteId || !mongoose.Types.ObjectId.isValid(String(favoriteId))) {
    const err = new Error('favoriteId invalide');
    err.status = 400;
    throw err;
  }

  const user = await User.findById(meUserId);
  if (!user) {
    const err = new Error('Utilisateur introuvable');
    err.status = 404;
    throw err;
  }

  const before = (user.favorites || []).length;
  user.favorites = (user.favorites || []).filter((f) => String(f.favoriteId) !== String(favoriteId));
  const after = user.favorites.length;

  if (before === after) {
    const err = new Error('Favori introuvable');
    err.status = 404;
    throw err;
  }

  await user.save();
  return user.favorites;
}

module.exports = {
  getUserIdFromTokenPayload,
  listFavorites,
  addFavorite,
  removeFavorite,
};

