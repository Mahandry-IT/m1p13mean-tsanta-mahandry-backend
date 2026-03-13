const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const { calculateCurrentStock, addStockMovement } = require('./stock.service');
const PDFService = require('./pdf.service');
const logger = require('../utils/logger');

module.exports = {
    // Ajouter un produit au panier (vérifie stock mais ne décrémente pas)
    addToCart: async(userId, { productId, storeId, quantity }) => {
        const user = await User.findById(userId);
        if (!user) throw Object.assign(new Error('Utilisateur introuvable'), { status: 404 });

        let order = await Order.findOne({ userId: user._id, status: 'pending' });
        if (!order) {
            order = new Order({
                userId: user._id,
                status: 'pending',
                items: [],
                subtotal: 0,
                tax: 0,
                total: 0
            });
        }

        const product = await Product.findById(productId);
        if (!product) throw Object.assign(new Error('Produit introuvable'), { status: 404 });

        const storeData = product.storeData.find(sd => sd.storeId.toString() === storeId);
        if (!storeData) throw Object.assign(new Error('Produit non disponible dans cette boutique'), { status: 404 });

        const currentStock = calculateCurrentStock(storeData.stockMovements);
        if (currentStock < quantity) {
            throw Object.assign(new Error(`Stock insuffisant. Disponible: ${currentStock}`), { status: 400 });
        }

        const itemIndex = order.items.findIndex(
            i => i.productId === productId && i.storeId.toString() === storeId
        );

        const unitPrice = storeData.currentPrice;

        if (itemIndex > -1) {
            order.items[itemIndex].quantity += quantity;
            order.items[itemIndex].totalPrice = order.items[itemIndex].quantity * parseFloat(unitPrice.toString());
        } else {
            order.items.push({
                detailId: new mongoose.Types.ObjectId(),
                productId: product._id,
                storeId: storeData.storeId,
                productName: product.name,
                quantity,
                unitPrice,
                totalPrice: quantity * parseFloat(unitPrice.toString())
            });
        }

        order.calculateTotals();
        await order.save();
        return order;
    },

    // Récupérer le panier en draft
    getCart: async(userId) => {
        const user = await User.findById(userId);
        if (!user) throw Object.assign(new Error('Utilisateur introuvable'), { status: 404 });

        return await Order.findOne({ userId: user._id, status: 'pending' });
    },

    removeItemFromCart: async (orderId, userId, productId, storeId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findOne({ _id: orderId, userId, status: 'pending' }).session(session);
            if (!order) throw Object.assign(new Error('Panier introuvable'), { status: 404 });

            const itemIndex = order.items.findIndex(i => {
                return String(i.productId) === String(productId) && String(i.storeId) === String(storeId);
            });

            if (itemIndex === -1) throw Object.assign(new Error('Produit non trouvé dans le panier'), { status: 404 });

            order.items.splice(itemIndex, 1);

            if (order.items.length === 0) {
                await Order.deleteOne({ _id: orderId }).session(session);
                await session.commitTransaction();
                session.endSession();
                return { message: 'Panier supprimé car vide' };
            }

            order.calculateTotals();

            await order.save({ session });
            await session.commitTransaction();
            session.endSession();

            return order;
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    },



    cancelCart: async (orderId, userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findOne({ _id: orderId, userId, status: 'pending' }).session(session);
            if (!order) throw Object.assign(new Error('Panier introuvable'), { status: 404 });

            await Order.deleteOne({ _id: orderId }).session(session);

            await session.commitTransaction();
            session.endSession();

            return { message: 'Panier annulé avec succès' };
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    },



    // Confirmer commande (transaction + décrémentation stock)
    confirmOrder: async(orderId, userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findById(orderId).session(session);
            if (!order) throw Object.assign(new Error('Commande introuvable'), { status: 404 });

            if (order.userId.toString() !== userId.toString()) {
                throw Object.assign(new Error('Vous ne pouvez pas confirmer cette commande'), { status: 403 });
            }

            if (order.status !== 'pending') {
                throw Object.assign(new Error(`Impossible de confirmer une commande avec le statut ${order.status}`), { status: 400 });
            }

            // Vérifier stock
            for (const item of order.items) {
                const product = await Product.findById(item.productId).session(session);
                if (!product) throw Object.assign(new Error(`Produit introuvable : ${item.productName}`), { status: 404 });

                const storeData = product.storeData.find(sd => sd.storeId.toString() === item.storeId.toString());
                if (!storeData) throw Object.assign(new Error(`Produit ${item.productName} non disponible dans cette boutique`), { status: 404 });

                const currentStock = calculateCurrentStock(storeData.stockMovements);
                if (currentStock < item.quantity) {
                    throw Object.assign(new Error(`Stock insuffisant pour ${item.productName}. Stock actuel: ${currentStock}`), { status: 400 });
                }
            }

            // Décrémenter stock
            for (const item of order.items) {
                await addStockMovement(item.productId, item.storeId, userId, {
                    isEntry: false,
                    quantity: item.quantity,
                    name: `Commande ${orderId}`
                }, session);
            }

            order.status = 'confirmed';
            order.addHistory('Commande confirmée', 'pending', 'confirmed', userId);
            await order.save({ session });

            await session.commitTransaction();
            session.endSession();

            return order;
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    },

    // Annuler commande (remet le stock si déjà confirmée)
    cancelOrder: async(orderId, userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findById(orderId).session(session);
            if (!order) throw Object.assign(new Error('Commande introuvable'), { status: 404 });

            if (order.userId.toString() !== userId.toString()) {
                throw Object.assign(new Error('Vous ne pouvez pas annuler cette commande'), { status: 403 });
            }

            if (['cancelled', 'delivered'].includes(order.status)) {
                throw Object.assign(new Error(`Impossible d'annuler une commande avec le statut ${order.status}`), { status: 400 });
            }

            if (order.status === 'confirmed') {
                for (const item of order.items) {
                    await addStockMovement(item.productId, item.storeId, userId, {
                        isEntry: true,
                        quantity: item.quantity,
                        name: `Annulation commande ${orderId}`
                    }, session);
                }
            }

            const previousStatus = order.status;
            order.status = 'cancelled';
            order.addHistory('Commande annulée', previousStatus, 'cancelled', userId);

            await order.save({ session });

            await session.commitTransaction();
            session.endSession();

            return order;
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    },    // Liste des commandes utilisateur (Customer)
    listUserOrders: async(userId, { page = 1, limit = 20 } = {}) => {
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Order.countDocuments({ userId })
        ]);

        return {
            orders,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Liste les commandes des boutiques du Manager connecté
     * Filtre les commandes qui contiennent au moins un item d'une boutique du manager
     * Triées par priorité de statut : pending > confirmed > shipped > delivered > cancelled
     */
    listOrdersByManager: async(managerId, { page = 1, limit = 20, status = null } = {}) => {
        const Store = require('../models/store.model');
        const skip = (page - 1) * limit;

        // 1. Récupérer les boutiques du manager
        const managerStores = await Store.find({ userId: managerId }).select('_id').lean();
        const storeIds = managerStores.map(s => s._id);

        if (storeIds.length === 0) {
            return {
                orders: [],
                pagination: { total: 0, page, limit, pages: 0 }
            };
        }

        // 2. Construire le filtre : commandes ayant au moins un item dans une boutique du manager
        const matchQuery = {
            'items.storeId': { $in: storeIds }
        };
        if (status) {
            matchQuery.status = status;
        }

        const [orders, totalResult] = await Promise.all([
            Order.aggregate([
                { $match: matchQuery },
                {
                    $addFields: {
                        statusPriority: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ['$status', 'pending'] }, then: 1 },
                                    { case: { $eq: ['$status', 'confirmed'] }, then: 2 },
                                    { case: { $eq: ['$status', 'shipped'] }, then: 3 },
                                    { case: { $eq: ['$status', 'delivered'] }, then: 4 },
                                    { case: { $eq: ['$status', 'cancelled'] }, then: 5 }
                                ],
                                default: 6
                            }
                        },
                        // Filtrer les items pour ne garder que ceux des boutiques du manager
                        managerItems: {
                            $filter: {
                                input: '$items',
                                as: 'item',
                                cond: { $in: ['$$item.storeId', storeIds] }
                            }
                        }
                    }
                },
                { $sort: { statusPriority: 1, createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'stores',
                        localField: 'managerItems.storeId',
                        foreignField: '_id',
                        as: 'stores'
                    }
                },                {
                    $project: {
                        _id: 1,
                        orderNumber: 1,
                        status: 1,
                        items: '$managerItems',
                        subtotal: 1,
                        tax: 1,
                        total: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        'user._id': 1,
                        'user.email': 1,
                        'user.profile.firstName': 1,
                        'user.profile.lastName': 1,
                        'user.profile.phone': 1,
                        'stores._id': 1,
                        'stores.name': 1
                    }
                }
            ]),
            Order.aggregate([
                { $match: matchQuery },
                { $count: 'total' }
            ])
        ]);

        const total = totalResult[0]?.total || 0;

        return {
            orders,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    },    // Détail commande (Customer = sa commande, Manager = commandes de ses boutiques)
    getOrderById: async(orderId, userId) => {
        const Store = require('../models/store.model');
        
        const order = await Order.findById(orderId)
            .populate('userId', 'email profile')
            .populate('items.storeId', 'name');
            
        if (!order) throw Object.assign(new Error('Commande introuvable'), { status: 404 });
        
        // Cas 1 : L'utilisateur est le propriétaire de la commande (Customer)
        if (order.userId._id.toString() === userId.toString()) {
            return order;
        }
        
        // Cas 2 : L'utilisateur est Manager d'une boutique concernée par la commande
        const managerStores = await Store.find({ userId }).select('_id').lean();
        const managerStoreIds = managerStores.map(s => s._id.toString());
        
        const orderStoreIds = order.items.map(item => 
            item.storeId?._id?.toString() || item.storeId?.toString()
        );
        
        const hasAccessAsManager = orderStoreIds.some(storeId => 
            managerStoreIds.includes(storeId)
        );
        
        if (hasAccessAsManager) {
            return order;
        }
        
        throw Object.assign(new Error('Vous ne pouvez pas accéder à cette commande'), { status: 403 });
    },

    // Mettre à jour le statut (avec historique et PDF)
    updateOrderStatus: async(orderId, newStatus, actorId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findById(orderId).session(session);
            if (!order) throw Object.assign(new Error('Commande introuvable'), { status: 404 });

            const allowedTransitions = {
                pending: ['confirmed', 'cancelled'],
                confirmed: ['shipped', 'cancelled'],
                shipped: ['delivered'],
                delivered: ['received'],
                received: []
            };

            if (!allowedTransitions[order.status]?.includes(newStatus)) {
                throw Object.assign(new Error(`Transition invalide`), { status: 400 });
            }

            const previousStatus = order.status;
            order.status = newStatus;
            order.statusUpdatedBy = actorId;
            order.statusUpdatedAt = new Date();
            order.addHistory('Changement de statut', previousStatus, newStatus, actorId);

            await order.save({ session });

            // Décrémentation stock uniquement si confirmation
            if (newStatus === 'confirmed') {
                for (const item of order.items) {
                    await addStockMovement(item.productId, item.storeId, actorId, {
                        isEntry: false,
                        quantity: item.quantity,
                        name: `Confirmation commande ${order._id}`
                    }, session);
                }
            }

            await session.commitTransaction();
            session.endSession();

            return order;
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    },

    deletePendingOrder: async(orderId, userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findOne({ _id: orderId, userId }).session(session);
            if (!order) throw Object.assign(new Error('Commande introuvable'), { status: 404 });

            if (order.status !== 'pending') {
                throw Object.assign(new Error('Seules les commandes en panier peuvent être supprimées'), { status: 400 });
            }

            await Order.deleteOne({ _id: orderId }).session(session);

            await session.commitTransaction();
            session.endSession();

            return { message: 'Panier supprimé avec succès' };
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    }


};