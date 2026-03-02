const Order = require('../models/order.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');

function buildDateFilter(startDate, endDate) {
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  return filter;
}

async function getStoreDashboard(storeId, { startDate, endDate }) {
  const dateFilter = buildDateFilter(startDate, endDate);

  // 1. Chiffre d’affaires
  const revenueAgg = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": new mongoose.Types.ObjectId(storeId), status: { $in: ["confirmed","shipped","delivered"] } } },
    { $group: { _id: null, revenue: { $sum: "$total" } } }
  ]);
  const revenue = revenueAgg[0]?.revenue || 0;

  // 2. Nombre de commandes
  const ordersCount = await Order.countDocuments({ ...dateFilter, "items.storeId": storeId });

  // 3. Produits vendus
  const productsSoldAgg = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": new mongoose.Types.ObjectId(storeId), status: { $in: ["confirmed","shipped","delivered"] } } },
    { $unwind: "$items" },
    { $match: { "items.storeId": new mongoose.Types.ObjectId(storeId) } },
    { $group: { _id: null, totalQty: { $sum: "$items.quantity" } } }
  ]);
  const productsSold = productsSoldAgg[0]?.totalQty || 0;

  // 4. Clients uniques
  const uniqueClientsAgg = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": new mongoose.Types.ObjectId(storeId) } },
    { $group: { _id: "$userId" } },
    { $count: "uniqueClients" }
  ]);
  const uniqueClients = uniqueClientsAgg[0]?.uniqueClients || 0;

  // 5. Stock actuel
  const productDocs = await Product.find({ "storeData.storeId": storeId });
  let stockTotal = 0;
  productDocs.forEach(p => {
    const storeData = p.storeData.find(sd => sd.storeId.toString() === storeId.toString());
    if (storeData) {
      const entries = storeData.stockMovements.filter(m => m.isEntry).reduce((sum, m) => sum + m.quantity, 0);
      const exits = storeData.stockMovements.filter(m => !m.isEntry).reduce((sum, m) => sum + m.quantity, 0);
      stockTotal += (entries - exits);
    }
  });

  // Schémas
  const revenueEvolution = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": new mongoose.Types.ObjectId(storeId), status: { $in: ["confirmed","shipped","delivered"] } } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$total" } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  const ordersEvolution = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": new mongoose.Types.ObjectId(storeId) } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  const topProducts = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": new mongoose.Types.ObjectId(storeId), status: { $in: ["confirmed","shipped","delivered"] } } },
    { $unwind: "$items" },
    { $match: { "items.storeId": new mongoose.Types.ObjectId(storeId) } },
    { $group: { _id: "$items.productId", totalQty: { $sum: "$items.quantity" } } },
    { $sort: { totalQty: -1 } },
    { $limit: 5 }
  ]);

  const stockEvolution = await Product.aggregate([
    { $match: { "storeData.storeId": new mongoose.Types.ObjectId(storeId) } },
    { $unwind: "$storeData" },
    { $match: { "storeData.storeId": new mongoose.Types.ObjectId(storeId) } },
    { $unwind: "$storeData.stockMovements" },
    { $group: { _id: { year: { $year: "$storeData.stockMovements.timestamp" }, month: { $month: "$storeData.stockMovements.timestamp" } }, qty: { $sum: { $cond: [{ $eq: ["$storeData.stockMovements.isEntry", true] }, "$storeData.stockMovements.quantity", { $multiply: ["$storeData.stockMovements.quantity", -1] }] } } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  const clientsEvolution = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": new mongoose.Types.ObjectId(storeId) } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, user: "$userId" } } },
    { $group: { _id: { year: "$_id.year", month: "$_id.month" }, uniqueClients: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  return {
    metrics: {
      revenue,
      ordersCount,
      productsSold,
      uniqueClients,
      stockTotal
    },
    schemas: {
      revenueEvolution,
      ordersEvolution,
      topProducts,
      stockEvolution,
      clientsEvolution
    }
  };
}

module.exports = { getStoreDashboard };
