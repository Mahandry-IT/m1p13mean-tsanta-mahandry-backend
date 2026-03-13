const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Store = require('../models/store.model');
const mongoose = require('mongoose');

/**
 * Convertit les Decimal128 en nombres pour l'affichage JSON
 */
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'object' && value.$numberDecimal) return parseFloat(value.$numberDecimal);
  if (value instanceof mongoose.Types.Decimal128) return parseFloat(value.toString());
  return parseFloat(value) || 0;
}

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

/**
 * Dashboard d'une boutique spécifique
 * Retourne les métriques et graphiques pour un store donné
 */
async function getStoreDashboard(storeId, { startDate, endDate }) {
  const dateFilter = buildDateFilter(startDate, endDate);
  const storeObjectId = new mongoose.Types.ObjectId(storeId);

  // Chiffre d'affaires (depuis les items filtrés par storeId)
  const revenueAgg = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": storeObjectId, status: { $in: ["confirmed","shipped","delivered"] } } },
    { $unwind: "$items" },
    { $match: { "items.storeId": storeObjectId } },
    { $group: { _id: null, revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } }
  ]);
  const revenue = revenueAgg[0]?.revenue || 0;

  // Nombre de commandes
  const ordersCount = await Order.countDocuments({ ...dateFilter, "items.storeId": storeId });

  // Produits vendus
  const productsSoldAgg = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": storeObjectId, status: { $in: ["confirmed","shipped","delivered"] } } },
    { $unwind: "$items" },
    { $match: { "items.storeId": storeObjectId } },
    { $group: { _id: null, totalQty: { $sum: "$items.quantity" } } }
  ]);
  const productsSold = productsSoldAgg[0]?.totalQty || 0;

  // Clients uniques
  const uniqueClientsAgg = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": storeObjectId } },
    { $group: { _id: "$userId" } },
    { $count: "uniqueClients" }
  ]);
  const uniqueClients = uniqueClientsAgg[0]?.uniqueClients || 0;

  // Stock actuel
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

  // Évolution du chiffre d'affaires par mois
  const revenueEvolution = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": storeObjectId, status: { $in: ["confirmed","shipped","delivered"] } } },
    { $unwind: "$items" },
    { $match: { "items.storeId": storeObjectId } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Évolution des commandes par mois
  const ordersEvolution = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": storeObjectId } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Top produits vendus
  const topProducts = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": storeObjectId, status: { $in: ["confirmed","shipped","delivered"] } } },
    { $unwind: "$items" },
    { $match: { "items.storeId": storeObjectId } },
    { $group: { _id: "$items.productId", totalQty: { $sum: "$items.quantity" } } },
    { $sort: { totalQty: -1 } },
    { $limit: 5 }
  ]);

  // Évolution du stock par mois
  const stockEvolution = await Product.aggregate([
    { $match: { "storeData.storeId": storeObjectId } },
    { $unwind: "$storeData" },
    { $match: { "storeData.storeId": storeObjectId } },
    { $unwind: "$storeData.stockMovements" },
    { $group: { _id: { year: { $year: "$storeData.stockMovements.timestamp" }, month: { $month: "$storeData.stockMovements.timestamp" } }, qty: { $sum: { $cond: [{ $eq: ["$storeData.stockMovements.isEntry", true] }, "$storeData.stockMovements.quantity", { $multiply: ["$storeData.stockMovements.quantity", -1] }] } } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Évolution des clients uniques par mois
  const clientsEvolution = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": storeObjectId } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, user: "$userId" } } },
    { $group: { _id: { year: "$_id.year", month: "$_id.month" }, uniqueClients: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  return {
    metrics: { revenue, ordersCount, productsSold, uniqueClients, stockTotal },
    schemas: { revenueEvolution, ordersEvolution, topProducts, stockEvolution, clientsEvolution }
  };
}

/**
 * Dashboard manager - Vue globale de toutes les boutiques du manager
 */
async function getManagerDashboard(managerId, { startDate, endDate, storeId }) {
  const dateFilter = buildDateFilter(startDate, endDate);

  // Récupérer les boutiques du manager
  const managerStores = await Store.find({ userId: managerId });
  const storeIds = managerStores.map(store => store._id);

  if (storeIds.length === 0) {
    return {
      message: "Aucune boutique trouvée pour ce manager",
      globalMetrics: {},
      storesSummary: [],
      analytics: {},
      alerts: {}
    };
  }

  // Filtrer par storeId si spécifié (vérification d'appartenance)
  let filteredStoreIds = storeIds;
  if (storeId) {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    if (!storeIds.some(id => id.equals(storeObjectId))) {
      throw new Error("Accès refusé : cette boutique ne vous appartient pas");
    }
    filteredStoreIds = [storeObjectId];
  }

  const globalMetrics = await calculateGlobalMetrics(filteredStoreIds, dateFilter);
  const storesSummary = await calculateStoresSummary(filteredStoreIds, dateFilter);
  const analytics = await calculateAnalytics(filteredStoreIds, dateFilter);
  const alerts = await calculateAlerts(filteredStoreIds);

  return { globalMetrics, storesSummary, analytics, alerts };
}

/**
 * Calcule les métriques globales pour un ensemble de boutiques
 */
async function calculateGlobalMetrics(storeIds, dateFilter) {
  // Revenus totaux (depuis les items filtrés par storeId)
  const revenueAgg = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": { $in: storeIds }, status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $unwind: "$items" },
    { $match: { "items.storeId": { $in: storeIds } } },
    { $group: { _id: null, totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } }
  ]);

  const ordersCount = await Order.countDocuments({ ...dateFilter, "items.storeId": { $in: storeIds } });
  const productsCount = await Product.countDocuments({ "storeData.storeId": { $in: storeIds } });

  const uniqueCustomersAgg = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": { $in: storeIds } } },
    { $group: { _id: "$userId" } },
    { $count: "uniqueCustomers" }
  ]);
  const totalRevenue = toNumber(revenueAgg[0]?.totalRevenue);
  const uniqueCustomers = uniqueCustomersAgg[0]?.uniqueCustomers || 0;
  return {
    totalStores: storeIds.length,
    activeStores: await Store.countDocuments({ _id: { $in: storeIds }, status: 'active' }),
    totalRevenue,
    totalOrders: ordersCount,
    totalProducts: productsCount,
    totalCustomers: uniqueCustomers,
    averageOrderValue: ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0
  };
}

/**
 * Calcule le résumé par boutique
 */
async function calculateStoresSummary(storeIds, dateFilter) {
  const stores = await Store.find({ _id: { $in: storeIds } });
  const summary = [];

  for (const store of stores) {
    // Revenus (depuis les items filtrés par storeId)
    const storeRevenueAgg = await Order.aggregate([
      { $match: { ...dateFilter, "items.storeId": store._id, status: { $in: ["confirmed", "shipped", "delivered"] } } },
      { $unwind: "$items" },
      { $match: { "items.storeId": store._id } },
      { $group: { _id: null, revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } }
    ]);

    const storeOrdersCount = await Order.countDocuments({ ...dateFilter, "items.storeId": store._id });
    const storeProductsCount = await Product.countDocuments({ "storeData.storeId": store._id });

    const storeCustomersAgg = await Order.aggregate([
      { $match: { ...dateFilter, "items.storeId": store._id } },
      { $group: { _id: "$userId" } },
      { $count: "customers" }
    ]);    const stockInfo = await calculateStoreStock(store._id);
    const pendingOrders = await Order.countDocuments({ "items.storeId": store._id, status: "pending" });

    summary.push({
      storeId: store._id,
      storeName: store.name,
      status: store.status,
      revenue: toNumber(storeRevenueAgg[0]?.revenue),
      orders: storeOrdersCount,
      products: storeProductsCount,
      customers: storeCustomersAgg[0]?.customers || 0,
      stockValue: stockInfo.value,
      lowStockAlerts: stockInfo.lowStockCount,
      pendingOrders
    });
  }

  return summary;
}

/**
 * Calcule les analytics (évolutions et tops)
 */
async function calculateAnalytics(storeIds, dateFilter) {  // Évolution des revenus (depuis les items filtrés par storeId)
  const revenueEvolution = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": { $in: storeIds }, status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $unwind: "$items" },
    { $match: { "items.storeId": { $in: storeIds } } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Évolution des commandes par mois
  const ordersEvolution = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": { $in: storeIds } } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Top boutiques performantes
  const topPerformingStores = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": { $in: storeIds }, status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $unwind: "$items" },
    { $match: { "items.storeId": { $in: storeIds } } },
    { $group: { _id: "$items.storeId", revenue: { $sum: "$items.totalPrice" } } },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
    { $lookup: { from: "stores", localField: "_id", foreignField: "_id", as: "store" } },
    { $unwind: "$store" },
    { $project: { storeId: "$_id", storeName: "$store.name", revenue: 1 } }
  ]);

  // Top produits toutes boutiques confondues
  const topProductsAcrossStores = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": { $in: storeIds }, status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $unwind: "$items" },
    { $match: { "items.storeId": { $in: storeIds } } },
    { $group: { _id: "$items.productName", totalSold: { $sum: "$items.quantity" }, revenue: { $sum: "$items.totalPrice" } } },
    { $sort: { totalSold: -1 } },
    { $limit: 10 },
    { $project: { productName: "$_id", totalSold: 1, revenue: 1, _id: 0 } }
  ]);  return {
    revenueEvolution: revenueEvolution.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      revenue: toNumber(item.revenue)
    })),
    ordersEvolution: ordersEvolution.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      count: item.count
    })),
    topPerformingStores: topPerformingStores.map(item => ({
      storeId: item._id,
      storeName: item.storeName,
      revenue: toNumber(item.revenue)
    })),
    topProductsAcrossStores: topProductsAcrossStores.map(item => ({
      productName: item.productName,
      totalSold: item.totalSold,
      revenue: toNumber(item.revenue)
    }))
  };
}

/**
 * Calcule les alertes (stock bas, commandes en attente)
 */
async function calculateAlerts(storeIds) {
  // Produits avec stock bas (< 5 unités)
  const lowStockProducts = await Product.aggregate([
    { $match: { "storeData.storeId": { $in: storeIds } } },
    { $unwind: "$storeData" },
    { $match: { "storeData.storeId": { $in: storeIds } } },
    {
      $addFields: {
        currentStock: {
          $subtract: [
            { $sum: { $map: { input: { $filter: { input: "$storeData.stockMovements", cond: { $eq: ["$$this.isEntry", true] } } }, as: "entry", in: "$$entry.quantity" } } },
            { $sum: { $map: { input: { $filter: { input: "$storeData.stockMovements", cond: { $eq: ["$$this.isEntry", false] } } }, as: "exit", in: "$$exit.quantity" } } }
          ]
        }
      }
    },
    { $match: { currentStock: { $lt: 5, $gte: 0 } } },
    { $lookup: { from: "stores", localField: "storeData.storeId", foreignField: "_id", as: "store" } },
    { $unwind: "$store" },
    { $project: { storeId: "$storeData.storeId", storeName: "$store.name", productName: "$name", stock: "$currentStock" } }
  ]);
  // Commandes en attente
  const pendingOrdersDetails = await Order.find({ "items.storeId": { $in: storeIds }, status: "pending" })
    .populate('userId', 'profile.firstName profile.lastName email')
    .limit(10)
    .select('_id orderNumber total createdAt items userId');

  const pendingOrdersFormatted = await Promise.all(
    pendingOrdersDetails.map(async (order) => {
      const storeItem = order.items.find(item => storeIds.some(storeId => storeId.equals(item.storeId)));      if (storeItem) {
        const store = await Store.findById(storeItem.storeId);
        return {
          storeId: storeItem.storeId,
          storeName: store?.name || 'Boutique inconnue',
          orderId: order._id,
          orderNumber: order.orderNumber || order._id.toString(),
          customerName: `${order.userId?.profile?.firstName || ''} ${order.userId?.profile?.lastName || ''}`.trim() || order.userId?.email || 'Client inconnu',
          total: toNumber(order.total),
          createdAt: order.createdAt
        };
      }
      return null;
    })
  );

  return {
    lowStock: lowStockProducts,
    pendingOrders: pendingOrdersFormatted.filter(Boolean)
  };
}

/**
 * Calcule le stock et sa valeur pour une boutique
 */
async function calculateStoreStock(storeId) {
  const products = await Product.find({ "storeData.storeId": storeId });
  
  let totalValue = 0;
  let lowStockCount = 0;

  products.forEach(product => {
    const storeData = product.storeData.find(sd => sd.storeId.equals(storeId));
    if (storeData) {
      const entries = storeData.stockMovements.filter(m => m.isEntry).reduce((sum, m) => sum + m.quantity, 0);
      const exits = storeData.stockMovements.filter(m => !m.isEntry).reduce((sum, m) => sum + m.quantity, 0);
      const currentStock = entries - exits;
      
      if (currentStock < 5 && currentStock >= 0) {
        lowStockCount++;
      }
      
      totalValue += currentStock * parseFloat(storeData.currentPrice.toString());
    }
  });

  return { value: totalValue, lowStockCount };
}

module.exports = { getStoreDashboard, getManagerDashboard };
