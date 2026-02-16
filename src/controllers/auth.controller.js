const AuthService = require('../services/auth.service');
const { success, error } = require('../utils/response');

module.exports = {
  async registerManager(req, res) {
    try {
      const result = await AuthService.register(req.body, '6990aefb7053d5bc9001e425');
      return success(res, result, 'Inscription réussie', 201);
    } catch (e) {
      return error(res, e.message || 'Erreur lors de l\'inscription du gestionnaire de boutique', e.status || 400);
    }
  },
  async registerUser(req, res) {
    try {
      const result = await AuthService.register(req.body);
      return success(res, result, 'Inscription réussie', 201);
    } catch (e) {
      return error(res, e.message || 'Erreur lors de l\'inscription de l\'utilisateur', e.status || 400);
    }
  },
  async login(req, res) {
    try {
      const result = await AuthService.login(req.body);
      return success(res, result, 'Connexion réussie');
    } catch (e) {
      return error(res, e.message || 'Erreur lors de la connexion', e.status || 401);
    }
  },
  async resetPassword(req, res) {
    try {
      const result = await AuthService.reset(req.body);
      return success(res, result, 'Email de réinitialisation envoyé');
    } catch (e) {
      return error(res, e.message || 'Erreur lors de la réinitialisation du mot de passe', e.status || 400);
    }
  },
  async activate(req, res) {
    try {
      const result = await AuthService.activate(req.params.token);
      return success(res, result, 'Compte activé avec succès');
    } catch (e) {
      return error(res, e.message || 'Erreur lors de l\'activation du compte', e.status || 400);
    }
  },
  async changePassword(req, res) {
    try {
      const result = await AuthService.change(req.body);
      return success(res, result, 'Mot de passe changé avec succès');
    } catch (e) {
      return error(res, e.message || 'Erreur lors du changement de mot de passe', e.status || 400, e.details || null);
    }
  },
  async logout(req, res) {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      const result = await AuthService.logout(token);
      return success(res, result, 'Déconnexion réussie');
    } catch (e) {
      return error(res, e.message || 'Erreur lors de la déconnexion', e.status || 400);
    }
  }

};
