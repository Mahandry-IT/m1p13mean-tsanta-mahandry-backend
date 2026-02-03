const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  roles: Joi.array().items(Joi.string()).optional()
}).min(1);

const userIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

module.exports = {
  registerSchema,
  loginSchema,
  userUpdateSchema,
  userIdParamSchema
};
