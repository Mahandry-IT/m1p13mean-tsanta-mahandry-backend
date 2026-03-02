const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
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

async function getAdminDashboard({ startDate, endDate }) {
    const dateFilter = buildDateFilter(startDate, endDate);

    // Métriques globales
    const totalRevenueAgg = await Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;

    const totalOrders = await Order.countDocuments(dateFilter);
    const totalUsers = await User.countDocuments(dateFilter);
    const totalProducts = await Product.countDocuments();
    const totalStores = await Store.countDocuments();

    // Évolutions
    const revenueEvolution = await Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
        { $group: { 
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, 
            revenue: { $sum: "$total" } 
        }},
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const ordersEvolution = await Order.aggregate([
        { $match: dateFilter },
        { $group: { 
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, 
            count: { $sum: 1 } 
        }},
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const usersEvolution = await User.aggregate([
        { $match: dateFilter },
        { $group: { 
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, 
            count: { $sum: 1 } 
        }},
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Top produits vendus
    const topProducts = await Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
        { $unwind: "$items" },
        { $group: { 
            _id: "$items.productId", 
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
        }},
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
    ]);

    // Répartition des commandes par statut
    const ordersByStatus = await Order.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Top boutiques par revenus
    const topStores = await Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
        { $unwind: "$items" },
        { $group: { 
            _id: "$items.storeId", 
            totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
            totalOrders: { $sum: 1 }
        }},
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
    ]);

    return {
        metrics: {
            totalRevenue,
            totalOrders,
            totalUsers,
            totalProducts,
            totalStores
        },
        charts: {
            revenueEvolution,
            ordersEvolution,
            usersEvolution,
            topProducts,
            ordersByStatus,
            topStores
        }
    };
}

module.exports = { getAdminDashboard };
