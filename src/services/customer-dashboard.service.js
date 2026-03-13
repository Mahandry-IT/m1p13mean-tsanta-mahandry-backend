const Order = require('../models/order.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');

/**
 * Construit un filtre de date pour les requêtes MongoDB
 * Ignore les valeurs vides ou invalides
 */
function buildDateFilter(startDate, endDate) {
  const filter = {};
  const validStart = startDate && !isNaN(new Date(startDate).getTime());
  const validEnd = endDate && !isNaN(new Date(endDate).getTime());
  
  if (validStart || validEnd) {
    filter.createdAt = {};
    if (validStart) filter.createdAt.$gte = new Date(startDate);
    if (validEnd) filter.createdAt.$lte = new Date(endDate);
  }
  return filter;
}

async function getCustomerDashboard(userId, { startDate, endDate }) {
  const dateFilter = buildDateFilter(startDate, endDate);

  // 1. Total des dépenses
  const totalSpentAgg = await Order.aggregate([
    { $match: { ...dateFilter, userId: new mongoose.Types.ObjectId(userId), status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $group: { _id: null, totalSpent: { $sum: "$total" } } }
  ]);
  const totalSpent = totalSpentAgg[0]?.totalSpent || 0;

  // 2. Nombre total de commandes
  const totalOrders = await Order.countDocuments({ ...dateFilter, userId });

  // 3. Produits achetés
  const totalProductsAgg = await Order.aggregate([
    { $match: { ...dateFilter, userId: new mongoose.Types.ObjectId(userId), status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $unwind: "$items" },
    { $group: { _id: null, totalProducts: { $sum: "$items.quantity" } } }
  ]);
  const totalProducts = totalProductsAgg[0]?.totalProducts || 0;

  // 4. Commandes en cours
  const pendingOrders = await Order.countDocuments({ 
    ...dateFilter, 
    userId, 
    status: { $in: ["pending", "confirmed", "shipped"] } 
  });

  // 5. Panier moyen
  const averageOrder = totalOrders > 0 ? (totalSpent / totalOrders).toFixed(2) : 0;

  // Évolutions et statistiques
  const spendingEvolution = await Order.aggregate([
    { $match: { ...dateFilter, userId: new mongoose.Types.ObjectId(userId), status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $group: { 
      _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, 
      totalSpent: { $sum: "$total" } 
    }},
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  const ordersEvolution = await Order.aggregate([
    { $match: { ...dateFilter, userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { 
      _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, 
      count: { $sum: 1 } 
    }},
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Produits favoris (plus commandés)
  const favoriteProducts = await Order.aggregate([
    { $match: { ...dateFilter, userId: new mongoose.Types.ObjectId(userId), status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $unwind: "$items" },
    { $group: { 
      _id: "$items.productId", 
      totalQuantity: { $sum: "$items.quantity" },
      totalSpent: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
    }},
    { $sort: { totalQuantity: -1 } },
    { $limit: 5 }
  ]);

  // Statut des commandes
  const ordersByStatus = await Order.aggregate([
    { $match: { ...dateFilter, userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  // Commandes récentes (dernières 5)
  const recentOrders = await Order.find({ userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('_id total status createdAt items');

  return {
    metrics: {
      totalSpent,
      totalOrders,
      totalProducts,
      pendingOrders,
      averageOrder
    },
    charts: {
      spendingEvolution,
      ordersEvolution,
      favoriteProducts,
      ordersByStatus
    },
    recentActivity: {
      recentOrders
    }
  };
}

module.exports = { getCustomerDashboard };