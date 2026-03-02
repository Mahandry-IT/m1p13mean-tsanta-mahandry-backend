const ManagerDashboardService = require('../services/manager-dashboard.service');
const { success, error } = require('../utils/response');

module.exports = {
    // GET /api/dashboard/manager — tableau de bord manager global
    async getDashboard(req, res) {
        try {
            const managerId = req.user.id;  // ID du manager connecté
            const { startDate, endDate, storeId } = req.query;

            const dashboard = await ManagerDashboardService.getManagerDashboard(managerId, { 
                startDate, 
                endDate, 
                storeId 
            });
            
            return success(res, dashboard, 'Tableau de bord manager récupéré avec succès');
        } catch (e) {
            return error(res, e.message || 'Erreur lors de la récupération du tableau de bord manager');
        }
    }
};
