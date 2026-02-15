const Joi = require('joi');

const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  roles: Joi.array().items(Joi.string()).optional()
}).min(1);

const userIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

module.exports = {
  userUpdateSchema,
  userIdParamSchema
};
