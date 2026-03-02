const mongoose = require('mongoose');
const Product = require('../models/product.model');
const Order = require("../models/order.model");

function isPromotionEnded(promo) {
  if (!promo?.endDate) return false;
  return new Date(promo.endDate) < new Date();
}

function normalizeBoolean(v) {
  if (v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  return String(v).toLowerCase() === 'true';
}

async function create({ productId, storeId, discount, description, startDate, endDate, isActive }) {
  if (!productId) {
    const err = new Error('productId est requis');
    err.status = 400;
    throw err;
  }
  if (!storeId || !mongoose.Types.ObjectId.isValid(String(storeId))) {
    const err = new Error('storeId invalide');
    err.status = 400;
    throw err;
  }

  const product = await Product.findById(String(productId));
  if (!product) {
    const err = new Error('Produit introuvable');
    err.status = 404;
    throw err;
  }

  const storeData = (product.storeData || []).find((sd) => sd.storeId?.toString() === String(storeId));
  if (!storeData) {
    const err = new Error('storeId introuvable dans storeData du produit');
    err.status = 404;
    throw err;
  }

  const promo = {
    promotionId: new mongoose.Types.ObjectId(),
    discount: mongoose.Types.Decimal128.fromString(String(discount)),
    description,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    isActive: normalizeBoolean(isActive) ?? true,
  };

  storeData.promotions = Array.isArray(storeData.promotions) ? storeData.promotions : [];
  storeData.promotions.push(promo);

  await product.save();

  return {
    productId: product._id,
    storeId: storeData.storeId,
    promotion: promo,
  };
}

async function list({ productId, storeId, isActive } = {}) {
  if (!productId) {
    const err = new Error('productId est requis');
    err.status = 400;
    throw err;
  }

  const product = await Product.findById(String(productId)).lean();
  if (!product) {
    const err = new Error('Produit introuvable');
    err.status = 404;
    throw err;
  }

  let storeDataArr = Array.isArray(product.storeData) ? product.storeData : [];

  if (storeId) {
    if (!mongoose.Types.ObjectId.isValid(String(storeId))) {
      const err = new Error('storeId invalide');
      err.status = 400;
      throw err;
    }
    storeDataArr = storeDataArr.filter((sd) => sd.storeId?.toString() === String(storeId));
  }

  const activeFilter = normalizeBoolean(isActive);

  const promotions = storeDataArr.flatMap((sd) =>
    (sd.promotions || [])
      .filter((p) => (activeFilter === undefined ? true : Boolean(p.isActive) === activeFilter))
      .map((p) => ({
        productId: product._id,
        storeId: sd.storeId,
        promotionId: p.promotionId,
        discount: p.discount,
        description: p.description,
        startDate: p.startDate,
        endDate: p.endDate,
        isActive: p.isActive,
        ended: isPromotionEnded(p),
      }))
  );

  return { promotions };
}

async function getById({ productId, storeId, promotionId }) {
  if (!productId) {
    const err = new Error('productId est requis');
    err.status = 400;
    throw err;
  }
  if (!storeId || !mongoose.Types.ObjectId.isValid(String(storeId))) {
    const err = new Error('storeId invalide');
    err.status = 400;
    throw err;
  }
  if (!promotionId || !mongoose.Types.ObjectId.isValid(String(promotionId))) {
    const err = new Error('promotionId invalide');
    err.status = 400;
    throw err;
  }

  const product = await Product.findById(String(productId));
  if (!product) {
    const err = new Error('Produit introuvable');
    err.status = 404;
    throw err;
  }

  const storeData = (product.storeData || []).find((sd) => sd.storeId?.toString() === String(storeId));
  if (!storeData) {
    const err = new Error('storeId introuvable dans storeData du produit');
    err.status = 404;
    throw err;
  }

  const promo = (storeData.promotions || []).find((p) => p.promotionId?.toString() === String(promotionId));
  if (!promo) {
    const err = new Error('Promotion introuvable');
    err.status = 404;
    throw err;
  }

  return {
    productId: product._id,
    storeId: storeData.storeId,
    promotion: {
      promotionId: promo.promotionId,
      discount: promo.discount,
      description: promo.description,
      startDate: promo.startDate,
      endDate: promo.endDate,
      isActive: promo.isActive,
      ended: isPromotionEnded(promo),
    },
  };
}

async function update({ productId, storeId, promotionId, discount, description, startDate, endDate, isActive }) {
  if (!promotionId || !mongoose.Types.ObjectId.isValid(String(promotionId))) {
    const err = new Error('promotionId invalide');
    err.status = 400;
    throw err;
  }

  const res = await getById({ productId, storeId, promotionId });

  // Recharger le doc (getById peut renvoyer lean selon impl, ici c'est doc mais on a besoin de save)
  const product = await Product.findById(String(productId));
  const storeData = (product.storeData || []).find((sd) => sd.storeId?.toString() === String(storeId));
  const promo = (storeData.promotions || []).find((p) => p.promotionId?.toString() === String(promotionId));

  if (isPromotionEnded(promo)) {
    const err = new Error('Impossible de modifier une promotion déjà terminée');
    err.status = 409;
    throw err;
  }

  if (discount !== undefined) promo.discount = mongoose.Types.Decimal128.fromString(String(discount));
  if (description !== undefined) promo.description = description;
  if (startDate !== undefined) promo.startDate = new Date(startDate);
  if (endDate !== undefined) promo.endDate = new Date(endDate);
  if (isActive !== undefined) promo.isActive = normalizeBoolean(isActive);

  await product.save();

  return getById({ productId, storeId, promotionId });
}

async function remove({ productId, storeId, promotionId }) {
  if (!promotionId || !mongoose.Types.ObjectId.isValid(String(promotionId))) {
    const err = new Error('promotionId invalide');
    err.status = 400;
    throw err;
  }

  const product = await Product.findById(String(productId));
  if (!product) {
    const err = new Error('Produit introuvable');
    err.status = 404;
    throw err;
  }

  const storeData = (product.storeData || []).find((sd) => sd.storeId?.toString() === String(storeId));
  if (!storeData) {
    const err = new Error('storeId introuvable dans storeData du produit');
    err.status = 404;
    throw err;
  }

  const promo = (storeData.promotions || []).find((p) => p.promotionId?.toString() === String(promotionId));
  if (!promo) {
    const err = new Error('Promotion introuvable');
    err.status = 404;
    throw err;
  }

  if (isPromotionEnded(promo)) {
    const err = new Error('Impossible de supprimer une promotion déjà terminée');
    err.status = 409;
    throw err;
  }

  storeData.promotions = (storeData.promotions || []).filter((p) => p.promotionId?.toString() !== String(promotionId));
  await product.save();

  return { productId: product._id, storeId: storeData.storeId, promotionId };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function computeDiscount({ soldQty, stock, daysSinceLastSale }) {
  // Heuristique simple (stable et explicable):
  // - plus c'est invendu (soldQty faible), plus le stock est haut, et plus la dernière vente est ancienne,
  //   plus la réduction monte.
  // Score [0..1]
  const stockFactor = stock <= 0 ? 0 : clamp(stock / 50, 0, 1); // stock >= 50 => 1
  const soldFactor = soldQty <= 0 ? 1 : clamp(1 / (1 + soldQty), 0, 1); // 0 vendu => 1
  const staleFactor = daysSinceLastSale == null ? 0.6 : clamp(daysSinceLastSale / 60, 0, 1); // 60j => 1

  const score = clamp(0.5 * soldFactor + 0.3 * stockFactor + 0.2 * staleFactor, 0, 1);

  // Discount en %: 5%..40%
  return Math.round(5 + score * 35);
}

function toNumber(val) {
  if (val == null) return 0;
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : 0;
}

function isPromotionOverlapping({ startDate, endDate }, existingPromo) {
  const aStart = new Date(startDate);
  const aEnd = new Date(endDate);
  const bStart = new Date(existingPromo.startDate);
  const bEnd = new Date(existingPromo.endDate);
  return aStart <= bEnd && bStart <= aEnd;
}

function calcStockFromMovements(movs = []) {
  let stock = 0;
  for (const m of movs) {
    if (!m) continue;
    stock += m.isEntry ? toNumber(m.quantity) : -toNumber(m.quantity);
  }
  return stock;
}

async function suggestPromotion({ storeId } = {}) {
  if (!storeId || !mongoose.Types.ObjectId.isValid(String(storeId))) {
    const err = new Error('storeId invalide');
    err.status = 400;
    throw err;
  }

  // 1) Trouver tous les produits présents dans cette boutique
  const products = await Product.find({ 'storeData.storeId': String(storeId) }).lean();
  if (!products.length) {
    const err = new Error('Aucun produit trouvé pour cette boutique');
    err.status = 404;
    throw err;
  }

  // 2) Calculer les ventes (quantité) par productId dans cette boutique (commandes confirmées + livrées)
  const salesAgg = await Order.aggregate([
    { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
    { $unwind: '$items' },
    { $match: { 'items.storeId': new mongoose.Types.ObjectId(String(storeId)) } },
    {
      $group: {
        _id: '$items.productId',
        soldQty: { $sum: '$items.quantity' },
        lastSaleAt: { $max: '$createdAt' },
      },
    },
  ]);

  const salesMap = new Map(salesAgg.map((r) => [String(r._id), { soldQty: r.soldQty || 0, lastSaleAt: r.lastSaleAt }]));

  // 3) Choisir le produit le moins vendu (tie-breaker: stock le plus grand)
  let best = null;

  for (const p of products) {
    const sd = (p.storeData || []).find((x) => String(x.storeId) === String(storeId));
    if (!sd) continue;

    const stock = calcStockFromMovements(sd.stockMovements || []);
    const sales = salesMap.get(String(p._id)) || { soldQty: 0, lastSaleAt: null };

    const candidate = {
      productId: p._id,
      productName: p.name,
      soldQty: sales.soldQty,
      lastSaleAt: sales.lastSaleAt,
      stock,
      currentPrice: sd.currentPrice,
      existingPromotions: sd.promotions || [],
    };

    if (!best) {
      best = candidate;
      continue;
    }

    if (candidate.soldQty < best.soldQty) {
      best = candidate;
      continue;
    }

    if (candidate.soldQty === best.soldQty && candidate.stock > best.stock) {
      best = candidate;
    }
  }

  if (!best) {
    const err = new Error('Impossible de déterminer un produit à promouvoir');
    err.status = 404;
    throw err;
  }

  // 4) Construire une promotion suggérée (non persistée)
  const now = new Date();
  const startDate = new Date(now);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 14); // 14 jours

  // Si une promo existante chevauche, on décale après la dernière endDate
  const overlapping = (best.existingPromotions || []).filter((pr) => pr?.startDate && pr?.endDate && isPromotionOverlapping({ startDate, endDate }, pr));
  if (overlapping.length) {
    const maxEnd = overlapping.reduce((m, pr) => (new Date(pr.endDate) > m ? new Date(pr.endDate) : m), new Date(overlapping[0].endDate));
    const shiftedStart = new Date(maxEnd);
    shiftedStart.setDate(shiftedStart.getDate() + 1);
    const shiftedEnd = new Date(shiftedStart);
    shiftedEnd.setDate(shiftedEnd.getDate() + 14);
    startDate.setTime(shiftedStart.getTime());
    endDate.setTime(shiftedEnd.getTime());
  }

  const daysSinceLastSale = best.lastSaleAt ? Math.floor((now - new Date(best.lastSaleAt)) / (1000 * 60 * 60 * 24)) : null;
  const discountPct = computeDiscount({ soldQty: best.soldQty, stock: best.stock, daysSinceLastSale });

  const promotion = {
    // non sauvegardée => pas de promotionId
    discountPercent: discountPct,
    description: `Suggestion auto: -${discountPct}% (produit invendu)` ,
    startDate,
    endDate,
    isActive: true,
  };

  return {
    storeId: String(storeId),
    product: {
      productId: best.productId,
      name: best.productName,
    },
    metrics: {
      soldQty: best.soldQty,
      stock: best.stock,
      daysSinceLastSale,
    },
    promotion,
  };
}


module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  suggestPromotion
};

