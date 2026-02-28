const Order = require('../models/order.model');
const OrderService = require('../services/order.service');
const PDFService = require('../services/pdf.service');
const { success, error } = require('../utils/response');

module.exports = {
    async downloadOrderPDF(req, res) {
        try {
            const orderId = req.params.orderId;
            const type = req.query.type || 'order';

            const order = await Order.findById(orderId)
                .populate('userId', 'email profile.firstName profile.lastName')
                .populate('items.storeId', 'name');

            if (!order) return error(res, 'Commande introuvable', 404);

            // ⚡ Vérification des statuts
            if (type === 'order' && order.status !== 'confirmed') {
                return error(res, 'Le bon de commande n’est disponible que pour les commandes confirmées', 400);
            }
            if (type === 'receipt' && order.status !== 'delivered') {
                return error(res, 'Le bon de réception n’est disponible que pour les commandes livrées', 400);
            }

            const pdfPath = await PDFService.generateOrderPDF(order, type);

            res.download(pdfPath, err => {
                if (err) return error(res, 'Erreur téléchargement PDF');
            });
        } catch (e) {
            return error(res, e.message || 'Erreur génération PDF', e.status || 400);
        }
    }

};
