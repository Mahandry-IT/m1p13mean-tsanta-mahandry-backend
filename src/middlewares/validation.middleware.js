const Joi = require('joi');

function formatJoiErrors(error) {
  return error.details.map((d) => {
    const field = d.path && d.path.length ? d.path.join('.') : (d.context && d.context.label) || 'field';
    let message = 'Validation échouée';
    switch (d.type) {
      case 'any.required':
        message = `Le champ ${field} est requis`;
        break;
      case 'string.empty':
        message = `Le champ ${field} ne doit pas être vide`;
        break;
      case 'string.email':
        message = `Le champ ${field} doit être un email valide`;
        break;
      case 'string.min':
        message = `Le champ ${field} doit contenir au moins ${d.context.limit} caractères`;
        break;
      case 'string.max':
        message = `Le champ ${field} doit contenir au plus ${d.context.limit} caractères`;
        break;
      case 'number.base':
        message = `Le champ ${field} doit être un nombre`;
        break;
      case 'number.min':
        message = `Le champ ${field} doit être supérieur ou égal à ${d.context.limit}`;
        break;
      case 'number.max':
        message = `Le champ ${field} doit être inférieur ou égal à ${d.context.limit}`;
        break;
      case 'array.min':
        message = `Le champ ${field} doit contenir au moins ${d.context.limit} éléments`;
        break;
      case 'array.max':
        message = `Le champ ${field} doit contenir au plus ${d.context.limit} éléments`;
        break;
      default:
        // Nettoyer le message anglais par défaut si nécessaire
        message = d.message.replace(/"/g, '').replace('is not allowed to be empty', 'ne doit pas être vide');
        break;
    }
    return { field, message };
  });
}

function validate(source, schema) {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
    if (error) {
      console.error(formatJoiErrors(error));
      return res.status(400).json({ success: false, message: 'Validation échouée', details: formatJoiErrors(error) });
    }
    // Assigner les valeurs nettoyées
    req[source] = value;
    next();
  };
}

module.exports = {
  body: (schema) => validate('body', schema),
  params: (schema) => validate('params', schema),
  query: (schema) => validate('query', schema)
};
