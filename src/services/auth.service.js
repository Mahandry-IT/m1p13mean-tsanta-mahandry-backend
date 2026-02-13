const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/user.model');
const Role = require('../models/role.model');

async function register({ username, email, firstName, lastName, password, role, phone}) {
  // Vérifications d'unicité email et username
  const existingByEmail = await User.findOne({ email });
  if (existingByEmail) {
    const err = new Error('Email déjà utilisé');
    err.status = 409;
    throw err;
  }
  const existingByUsername = await User.findOne({ username });
  if (existingByUsername) {
    const err = new Error('Nom d\'utilisateur déjà utilisé');
    err.status = 409;
    throw err;
  }

  // Hash du mot de passe et initialisation de l'historique
  const passwordHash = await bcrypt.hash(password, 10);
  const passwordHistory = [{ passwordHash, createdAt: new Date() }];

  // Construction des données utilisateur selon le modèle
  const userData = {
    username,
    email,
    firstName,
    lastName,
    phone: phone || undefined,
    role,
    status: 'pending',
    passwordHistory,
    failedAttempts: 0,
    sessions: [],
    favorites: []
  };

  const user = await User.create(userData);

  const token = jwt.sign(
    { id: user._id, email: user.email, roleId: user.roleId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
  const decoded = jwt.decode(token);
  const expiredAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 3600 * 1000);

  // Enregistrer la session en UTC
  user.sessions = [
    ...(user.sessions || []),
    { token, expiredAt, isActive: true }
  ];
  await user.save();

  // Construire une réponse publique sans champs sensibles
  const publicUser = {
    id: user._id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    phone: user.phone || null,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { token, user: publicUser };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Email incorrect');
    err.status = 401;
    throw err;
  }

  // Récupérer le dernier hash de mot de passe
  const lastEntry = (user.passwordHistory || []).slice(-1)[0];
  if (!lastEntry || !lastEntry.passwordHash) {
    const err = new Error('Mot de passe non défini');
    err.status = 401;
    throw err;
  }

  if (user.failedAttempts >= env.MAX_ATTEMPTS) {
    user.status = 'suspended';
    await user.save();
    const err = new Error('Votre compte a été suspendu après trop de tentatives échouées');
    err.status = 403;
    throw err;
  }

  const ok = await bcrypt.compare(password, lastEntry.passwordHash);
  if (!ok) {
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    await user.save();
    const err = new Error('Mot de passe incorrect');
    err.status = 401;
    throw err;
  }

  user.lastLoginAt = new Date();
  user.failedAttempts = 0;
  await user.save();

  const token = jwt.sign(
    { id: user._id, email: user.email, roleId: user.roleId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
  const decoded = jwt.decode(token);
  const expiredAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 3600 * 1000);

  // Enregistrer la session en UTC
  user.sessions = [
    ...(user.sessions || []),
  ];
  await user.save();

  // Récupérer le rôle lié pour fournir homepage
  let roleHomepage = null;
  try {
    const roleDoc = await Role.findById(user.roleId);
    roleHomepage = roleDoc && roleDoc.homepage ? roleDoc.homepage : null;
  } catch (_) {
    roleHomepage = null;
  }

  const publicUser = {
    id: user._id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    phone: user.phone || null,
    roleId: user.roleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt
  };

  return { token, homePage: roleHomepage, user: publicUser };
}

module.exports = { register, login };
