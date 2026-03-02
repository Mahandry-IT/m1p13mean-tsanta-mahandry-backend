const ManagerDashboardService = require('../services/manager-dashboard.service');
const { success, error } = require('../utils/response');

module.exports = {
    // GET /api/dashboard/manager/:storeId — tableau de bord manager
    async getDashboard(req, res) {
        try {
            const { storeId } = req.params;
            const { startDate, endDate } = req.query;

            if (!storeId) {
                return error(res, 'ID de boutique requis', 400);
            }

            const dashboard = await ManagerDashboardService.getStoreDashboard(storeId, { startDate, endDate });
            return success(res, dashboard, 'Tableau de bord manager récupéré avec succès');
        } catch (e) {
            return error(res, e.message || 'Erreur lors de la récupération du tableau de bord manager');
        }
    }
};
