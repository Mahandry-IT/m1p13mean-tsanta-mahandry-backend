const Joi = require('joi');

function validate(source, schema) {
  return (req, res, next) => {
    const data = req[source];
    const { error } = schema.validate(data, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation échouée', details: error.details.map(d => d.message) });
    }
    // Assign the sanitized values back
    const value = schema.validate(data, { stripUnknown: true }).value;
    req[source] = value;
    next();
  };
}

module.exports = {
  body: (schema) => validate('body', schema),
  params: (schema) => validate('params', schema),
  query: (schema) => validate('query', schema)
};

