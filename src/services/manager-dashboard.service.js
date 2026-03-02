const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Store = require('../models/store.model');
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

async function getManagerDashboard(managerId, { startDate, endDate, storeId }) {
  const dateFilter = buildDateFilter(startDate, endDate);

  // 1. Récupérer toutes les boutiques du manager
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

  // 2. Si storeId est spécifié, vérifier qu'il appartient au manager
  let filteredStoreIds = storeIds;
  if (storeId) {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    if (!storeIds.some(id => id.equals(storeObjectId))) {
      throw new Error("Accès refusé : cette boutique ne vous appartient pas");
    }
    filteredStoreIds = [storeObjectId];
  }

  // 3. Métriques globales
  const globalMetrics = await calculateGlobalMetrics(filteredStoreIds, dateFilter);

  // 4. Résumé par boutique
  const storesSummary = await calculateStoresSummary(filteredStoreIds, dateFilter);

  // 5. Analytics
  const analytics = await calculateAnalytics(filteredStoreIds, dateFilter);

  // 6. Alertes
  const alerts = await calculateAlerts(filteredStoreIds);

  return {
    globalMetrics,
    storesSummary,
    analytics,
    alerts
  };
}

async function calculateGlobalMetrics(storeIds, dateFilter) {
  // Revenus totaux
  const revenueAgg = await Order.aggregate([
    { 
      $match: { 
        ...dateFilter, 
        "items.storeId": { $in: storeIds }, 
        status: { $in: ["confirmed", "shipped", "delivered"] } 
      } 
    },
    { $group: { _id: null, totalRevenue: { $sum: "$total" } } }
  ]);

  // Nombre total de commandes
  const ordersCount = await Order.countDocuments({
    ...dateFilter,
    "items.storeId": { $in: storeIds }
  });

  // Nombre total de produits
  const productsCount = await Product.countDocuments({
    "storeData.storeId": { $in: storeIds }
  });

  // Clients uniques
  const uniqueCustomersAgg = await Order.aggregate([
    { $match: { ...dateFilter, "items.storeId": { $in: storeIds } } },
    { $group: { _id: "$userId" } },
    { $count: "uniqueCustomers" }
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
  const uniqueCustomers = uniqueCustomersAgg[0]?.uniqueCustomers || 0;

  return {
    totalStores: storeIds.length,
    activeStores: await Store.countDocuments({ _id: { $in: storeIds }, isActive: true }),
    totalRevenue,
    totalOrders: ordersCount,
    totalProducts: productsCount,
    totalCustomers: uniqueCustomers,
    averageOrderValue: ordersCount > 0 ? (totalRevenue / ordersCount) : 0
  };
}

async function calculateStoresSummary(storeIds, dateFilter) {
  const stores = await Store.find({ _id: { $in: storeIds } });
  const summary = [];

  for (const store of stores) {
    // Revenus par boutique
    const storeRevenueAgg = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          "items.storeId": store._id, 
          status: { $in: ["confirmed", "shipped", "delivered"] } 
        } 
      },
      { $group: { _id: null, revenue: { $sum: "$total" } } }
    ]);

    // Commandes par boutique
    const storeOrdersCount = await Order.countDocuments({
      ...dateFilter,
      "items.storeId": store._id
    });

    // Produits par boutique
    const storeProductsCount = await Product.countDocuments({
      "storeData.storeId": store._id
    });

    // Clients par boutique
    const storeCustomersAgg = await Order.aggregate([
      { $match: { ...dateFilter, "items.storeId": store._id } },
      { $group: { _id: "$userId" } },
      { $count: "customers" }
    ]);

    // Stock total et valeur
    const stockInfo = await calculateStoreStock(store._id);

    // Commandes en attente
    const pendingOrders = await Order.countDocuments({
      "items.storeId": store._id,
      status: "pending"
    });

    summary.push({
      storeId: store._id,
      storeName: store.name,
      status: store.isActive ? 'active' : 'inactive',
      revenue: storeRevenueAgg[0]?.revenue || 0,
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

async function calculateAnalytics(storeIds, dateFilter) {
  // Évolution des revenus
  const revenueEvolution = await Order.aggregate([
    { 
      $match: { 
        ...dateFilter, 
        "items.storeId": { $in: storeIds }, 
        status: { $in: ["confirmed", "shipped", "delivered"] } 
      } 
    },
    { 
      $group: { 
        _id: { 
          year: { $year: "$createdAt" }, 
          month: { $month: "$createdAt" } 
        }, 
        revenue: { $sum: "$total" } 
      } 
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Top boutiques performantes
  const topPerformingStores = await Order.aggregate([
    { 
      $match: { 
        ...dateFilter, 
        "items.storeId": { $in: storeIds }, 
        status: { $in: ["confirmed", "shipped", "delivered"] } 
      } 
    },
    { $unwind: "$items" },
    { $match: { "items.storeId": { $in: storeIds } } },
    { 
      $group: { 
        _id: "$items.storeId", 
        revenue: { $sum: "$items.totalPrice" } 
      } 
    },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "stores",
        localField: "_id",
        foreignField: "_id",
        as: "store"
      }
    },
    { $unwind: "$store" },
    {
      $project: {
        storeId: "$_id",
        storeName: "$store.name",
        revenue: 1
      }
    }
  ]);

  // Top produits toutes boutiques confondues
  const topProductsAcrossStores = await Order.aggregate([
    { 
      $match: { 
        ...dateFilter, 
        "items.storeId": { $in: storeIds }, 
        status: { $in: ["confirmed", "shipped", "delivered"] } 
      } 
    },
    { $unwind: "$items" },
    { $match: { "items.storeId": { $in: storeIds } } },
    { 
      $group: { 
        _id: "$items.productName", 
        totalSold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.totalPrice" }
      } 
    },
    { $sort: { totalSold: -1 } },
    { $limit: 10 },
    {
      $project: {
        productName: "$_id",
        totalSold: 1,
        revenue: 1,
        _id: 0
      }
    }
  ]);

  return {
    revenueEvolution: revenueEvolution.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      revenue: item.revenue
    })),
    topPerformingStores,
    topProductsAcrossStores
  };
}

async function calculateAlerts(storeIds) {
  // Stock bas (exemple : moins de 5 unités)
  const lowStockProducts = await Product.aggregate([
    { $match: { "storeData.storeId": { $in: storeIds } } },
    { $unwind: "$storeData" },
    { $match: { "storeData.storeId": { $in: storeIds } } },
    {
      $addFields: {
        currentStock: {
          $subtract: [
            {
              $sum: {
                $map: {
                  input: { $filter: { input: "$storeData.stockMovements", cond: { $eq: ["$$this.isEntry", true] } } },
                  as: "entry",
                  in: "$$entry.quantity"
                }
              }
            },
            {
              $sum: {
                $map: {
                  input: { $filter: { input: "$storeData.stockMovements", cond: { $eq: ["$$this.isEntry", false] } } },
                  as: "exit",
                  in: "$$exit.quantity"
                }
              }
            }
          ]
        }
      }
    },
    { $match: { currentStock: { $lt: 5, $gte: 0 } } },
    {
      $lookup: {
        from: "stores",
        localField: "storeData.storeId",
        foreignField: "_id",
        as: "store"
      }
    },
    { $unwind: "$store" },
    {
      $project: {
        storeId: "$storeData.storeId",
        storeName: "$store.name",
        productName: "$name",
        stock: "$currentStock"
      }
    }
  ]);

  // Commandes en attente
  const pendingOrdersDetails = await Order.find({
    "items.storeId": { $in: storeIds },
    status: "pending"
  })
  .populate('userId', 'profile.firstName profile.lastName email')
  .limit(10)
  .select('_id total createdAt items userId');

  const pendingOrdersFormatted = await Promise.all(
    pendingOrdersDetails.map(async (order) => {
      // Trouver le store concerné dans cette commande
      const storeItem = order.items.find(item => 
        storeIds.some(storeId => storeId.equals(item.storeId))
      );
      
      if (storeItem) {
        const store = await Store.findById(storeItem.storeId);
        return {
          storeId: storeItem.storeId,
          storeName: store?.name || 'Boutique inconnue',
          orderId: order._id,
          customerName: `${order.userId?.profile?.firstName || ''} ${order.userId?.profile?.lastName || ''}`.trim() || order.userId?.email || 'Client inconnu',
          total: order.total,
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

async function calculateStoreStock(storeId) {
  const products = await Product.find({ "storeData.storeId": storeId });
  
  let totalValue = 0;
  let lowStockCount = 0;

  products.forEach(product => {
    const storeData = product.storeData.find(sd => sd.storeId.equals(storeId));
    if (storeData) {
      const entries = storeData.stockMovements
        .filter(m => m.isEntry)
        .reduce((sum, m) => sum + m.quantity, 0);
      
      const exits = storeData.stockMovements
        .filter(m => !m.isEntry)
        .reduce((sum, m) => sum + m.quantity, 0);
      
      const currentStock = entries - exits;
      
      if (currentStock < 5 && currentStock >= 0) {
        lowStockCount++;
      }
      
      totalValue += currentStock * parseFloat(storeData.currentPrice.toString());
    }
  });

  return {
    value: totalValue,
    lowStockCount
  };
}

module.exports = { 
  getStoreDashboard,
  getManagerDashboard
};
