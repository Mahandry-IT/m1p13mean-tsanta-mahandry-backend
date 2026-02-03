const logger = require('../utils/logger');

function notFoundHandler(req, res, next) {
  res.status(404).json({ success: false, message: 'Ressource non trouvée' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(err);
  const status = err.status || 500;
  const message = err.message || 'Erreur interne du serveur';
  res.status(status).json({ success: false, message });
}

module.exports = { notFoundHandler, errorHandler };
