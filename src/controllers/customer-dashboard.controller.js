const CustomerDashboardService = require('../services/customer-dashboard.service');
const { success, error } = require('../utils/response');

module.exports = {
    // GET /api/dashboard/customer — tableau de bord client
    async getDashboard(req, res) {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            const { startDate, endDate } = req.query;
            
            const dashboard = await CustomerDashboardService.getCustomerDashboard(userId, { startDate, endDate });
            return success(res, dashboard, 'Tableau de bord client récupéré avec succès');
        } catch (e) {
            return error(res, e.message || 'Erreur lors de la récupération du tableau de bord client');
        }
    }
};