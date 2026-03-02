const Order = require('../models/order.model');
const Store = require('../models/store.model');
const User = require('../models/user.model');

// Helper pour filtrer par date
function buildDateFilter(startDate, endDate) {
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  return filter;
}

async function getDashboardData({ startDate, endDate }) {
  const dateFilter = buildDateFilter(startDate, endDate);

  // 1. Chiffre d’affaires global
  const totalRevenueAgg = await Order.aggregate([
    { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $group: { _id: null, totalRevenue: { $sum: "$total" } } }
  ]);
  const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;

  // 2. Nombre total de commandes
  const totalOrders = await Order.countDocuments({ ...dateFilter });

  // 3. Nombre de boutiques actives
  const totalActiveStores = await Store.countDocuments({ isActive: true });

  // 4. Nombre de nouveaux utilisateurs
  const totalUsers = await User.countDocuments({ ...dateFilter });

  // 5. Nombre de produits vendus
  const productsSoldAgg = await Order.aggregate([
    { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $unwind: "$items" },
    { $group: { _id: null, totalQty: { $sum: "$items.quantity" } } }
  ]);
  const totalProductsSold = productsSoldAgg[0]?.totalQty || 0;

  // Schémas
  const revenueByStore = await Order.aggregate([
    { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.storeId", revenue: { $sum: "$items.totalPrice" } } },
    { $lookup: { from: "stores", localField: "_id", foreignField: "_id", as: "store" } },
    { $unwind: "$store" },
    { $project: { storeName: "$store.name", revenue: 1 } }
  ]);

  const revenueEvolution = await Order.aggregate([
    { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$total" } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  const ordersEvolution = await Order.aggregate([
    { $match: { ...dateFilter } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  const activeStoresEvolution = await Store.aggregate([
    { $match: { ...dateFilter, isActive: true } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  const usersEvolution = await User.aggregate([
    { $match: { ...dateFilter } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  return {
    metrics: {
      totalRevenue,
      totalOrders,
      totalActiveStores,
      totalUsers,
      totalProductsSold
    },
    schemas: {
      revenueByStore,
      revenueEvolution,
      ordersEvolution,
      activeStoresEvolution,
      usersEvolution
    }
  };
}

module.exports = { getDashboardData };
