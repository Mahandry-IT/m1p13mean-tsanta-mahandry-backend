const logger = require('./logger');

function success(res, data = null, message = 'Succès', status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

function error(res, message = 'Erreur', status = 400, details = null) {
  // Log minimal pour traçabilité
  if (details) {
    logger.error(`[Response Error] ${message}`, details);
  } else {
    logger.error(`[Response Error] ${message}`);
  }
  return res.status(status).json({
    success: false,
    message,
    details: details || null,
  });
}

module.exports = { success, error };
