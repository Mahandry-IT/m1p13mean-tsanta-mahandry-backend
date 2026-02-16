const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/user.model');

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Token manquant dans l\'entête' });
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    // Vérifier l'utilisateur via l'email contenu dans le token
    const user = await User.findOne({ email: payload.email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Ce token n\'est associé à aucun utilisateur' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Le compte utilisateur doit être actif pour accéder à cette ressource' });
    }
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token invalide', details: e.message });
  }
}
