const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Token manquant' });
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
};

