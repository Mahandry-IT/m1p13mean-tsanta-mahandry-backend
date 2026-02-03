const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/user.model');

async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email déjà utilisé');
    err.status = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  const token = jwt.sign({ id: user._id, email: user.email, roles: user.roles }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  return { token, user: user.toPublicJSON() };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Identifiants invalides');
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Identifiants invalides');
    err.status = 401;
    throw err;
  }
  const token = jwt.sign({ id: user._id, email: user.email, roles: user.roles }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  return { token, user: user.toPublicJSON() };
}

module.exports = { register, login };

