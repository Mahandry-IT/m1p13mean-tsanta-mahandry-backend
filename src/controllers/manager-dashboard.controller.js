const dashboardService = require('../services/storeDashboard.service');
const { success, error } = require('../utils/response');

module.exports = {
  async getDashboard(req, res) {
    try {
      const storeId = req.params.storeId; // ou récupéré via le manager connecté
      const data = await dashboardService.getStoreDashboard(storeId, req.query);
      return success(res, 'Dashboard boutique', data);
    } catch (e) {
      return error(res, e.message);
    }
  }
};
