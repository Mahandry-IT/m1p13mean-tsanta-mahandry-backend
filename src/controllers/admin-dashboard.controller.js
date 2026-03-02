const AdminDashboardService = require('../services/admin-dashboard.service');
const { success, error } = require('../utils/response');

module.exports = {
    // GET /api/dashboard/admin — tableau de bord admin
    async getDashboard(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            const dashboard = await AdminDashboardService.getAdminDashboard({ startDate, endDate });
            return success(res, dashboard, 'Tableau de bord admin récupéré avec succès');
        } catch (e) {
            return error(res, e.message || 'Erreur lors de la récupération du tableau de bord admin');
        }
    }
};
