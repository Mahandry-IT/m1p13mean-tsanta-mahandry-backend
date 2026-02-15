// Simple middleware d'autorisation basé sur les features du rôle
const Role = require('../models/role.model');

module.exports = function authorize(required) {
  const requiredFeatures = Array.isArray(required) ? required : [required];
  return async function (req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Veuillez vous authentifier' });
      const roleId = req.user.roleId;
      if (!roleId) return res.status(403).json({ success: false, message: 'Rôle non défini dans le token' });

      const role = await Role.findById(roleId).lean();
      if (!role) return res.status(403).json({ success: false, message: 'Ce rôle n\'existe pas' });

      const userFeatures = new Set((role.features || []).map(f => f.name));
      const ok = requiredFeatures.every(f => userFeatures.has(f));
      if (!ok) return res.status(403).json({ success: false, message: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette ressource' , required: requiredFeatures});

      return next();
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'autorisation' , details: e.message });
    }
  };
}

