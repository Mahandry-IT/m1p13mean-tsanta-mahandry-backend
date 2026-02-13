const AuthService = require('../services/auth.service');
const { success, error } = require('../utils/response');

module.exports = {
  async register(req, res) {
    try {
      const result = await AuthService.register(req.body);
      return success(res, result, 'Inscription réussie', 201);
    } catch (e) {
      return error(res, e.message || 'Erreur lors de l\'inscription', e.status || 400);
    }
  },
  async login(req, res) {
    try {
      const result = await AuthService.login(req.body);
      return success(res, result, 'Connexion réussie');
    } catch (e) {
      return error(res, e.message || 'Erreur lors de la connexion', e.status || 401);
    }
  }
};

