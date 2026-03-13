const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
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
 * Dashboard administrateur - Vue globale de la plateforme
 * Retourne les métriques et graphiques pour l'ensemble de la plateforme
 */
async function getAdminDashboard({ startDate, endDate }) {
    const dateFilter = buildDateFilter(startDate, endDate);

    // Métriques globales
    const totalRevenueAgg = await Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
        { $unwind: "$items" },
        { $group: { _id: null, totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } }
    ]);    const totalRevenue = toNumber(totalRevenueAgg[0]?.totalRevenue);

    const totalOrders = await Order.countDocuments(dateFilter);
    const totalUsers = await User.countDocuments(dateFilter);
    const totalProducts = await Product.countDocuments();
    const totalStores = await Store.countDocuments();

    // Évolution des revenus par mois
    const revenueEvolution = await Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
        { $unwind: "$items" },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Évolution des commandes par mois
    const ordersEvolution = await Order.aggregate([
        { $match: dateFilter },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Évolution des utilisateurs par mois
    const usersEvolution = await User.aggregate([
        { $match: dateFilter },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);    // Top produits vendus (avec nom du produit)
    const topProducts = await Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
        { $unwind: "$items" },
        { $group: { _id: "$items.productId", totalQuantity: { $sum: "$items.quantity" }, totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, productName: { $ifNull: ["$product.name", "Produit inconnu"] }, totalQuantity: 1, totalRevenue: 1 } }
    ]);

    // Répartition des commandes par statut
    const ordersByStatus = await Order.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Top boutiques par revenus (avec nom de la boutique)
    const topStores = await Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ["confirmed", "shipped", "delivered"] } } },
        { $unwind: "$items" },
        { $group: { _id: "$items.storeId", totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } }, totalOrders: { $sum: 1 } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
        { $lookup: { from: "stores", localField: "_id", foreignField: "_id", as: "store" } },
        { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, storeName: { $ifNull: ["$store.name", "Boutique inconnue"] }, totalRevenue: 1, totalOrders: 1 } }
    ]);    return {
        metrics: { totalRevenue, totalOrders, totalUsers, totalProducts, totalStores },
        charts: { 
            revenueEvolution: revenueEvolution.map(item => ({
                ...item,
                revenue: toNumber(item.revenue)
            })),
            ordersEvolution, 
            usersEvolution, 
            topProducts: topProducts.map(item => ({
                ...item,
                totalRevenue: toNumber(item.totalRevenue)
            })),
            ordersByStatus, 
            topStores: topStores.map(item => ({
                ...item,
                totalRevenue: toNumber(item.totalRevenue)
            }))
        }
    };
}

module.exports = { getAdminDashboard };
