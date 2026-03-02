const dashboardService = require('../services/adminDashboard.service');
const { success, error } = require('../utils/response');

module.exports = {
  async getDashboard(req, res) {
    try {
      const data = await dashboardService.getDashboardData(req.query);
      return success(res, 'Dashboard admin', data);
    } catch (e) {
      return error(res, e.message);
    }
  }
};
