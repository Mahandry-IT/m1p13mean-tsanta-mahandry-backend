const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/mailer');

function getActivationLink(path, field, value) {
  const origin = (env.CORS_ORIGINS && env.CORS_ORIGINS[0]) || ('http://localhost:' + env.PORT);
  const base = origin.replace(/\/$/, '') + '/api/auth';
  const url = new URL(path, base);
  if (field && typeof field === 'object') {
    Object.entries(field).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  } else if (field) {
    url.searchParams.set(field, value);
  }
  return url.href;
}

async function register({ username, email, password}, role = '6990aefb7053d5bc9001e427') {
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
    roleId: role,
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

  // Envoyer email d'activation
  const activationLink = getActivationLink('/activate', 'token', encodeURIComponent(token));
  try {
    await sendEmail({
      to: user.email,
      subject: 'Activation de votre compte',
      html: `<p>Bonjour ${user.username},</p><p>Merci pour votre inscription.</p><p><a href="${activationLink}">Cliquez ici pour activer votre compte</a></p><p>Ce lien expirera dans <strong>${env.JWT_EXPIRES_IN}</strong>.</p>`
    });
  } catch (e) {
    logger.error('Échec d\'envoi de l\'email d\'activation', { email: user.email, error: e.message });
  }

  // Construire une réponse publique sans champs sensibles
  const publicUser = {
    username: user.username,
    email: user.email
  };

  return { user: publicUser };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Email incorrect');
    err.status = 401;
    throw err;
  }

  // Vérifier le statut du compte avant de vérifier le mot de passe
  const normalizedStatus = (user.status || '').toLowerCase();
  const statusMessages = {
    suspended: 'Votre compte est suspendu.',
    inactive: 'Votre compte est inactif.',
    pending: 'Votre compte est en attente de validation.'
  };

  if (statusMessages[normalizedStatus]) {
    const err = new Error(
        statusMessages[normalizedStatus] +
        " Vérifiez votre boite mail pour les instructions ou contactez le support."
    );
    err.status = 403;
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

    const token = jwt.sign(
        { email: email },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
    );

    const activationLink = getActivationLink('/new-password', { email, token: encodeURIComponent(token) } );
    try {
      await sendEmail({
        to: user.email,
        subject: 'Réactivation de votre compte',
        html: `<p>Bonjour ${user.username},</p><p>Votre compte a été suspendu après trop de tentatives de connexion échouées.</p><p><a href="${activationLink}">Cliquez ici pour réactiver votre compte</a></p><p>Ce lien expirera dans <strong>${env.JWT_EXPIRES_IN}</strong>.</p>`
      });
    } catch (e) {
      logger.error('Échec d\'envoi de l\'email de réactivation', { email: user.email, error: e.message });
    }
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
    username: user.username,
    email: user.email,
    profile: user.profile ? user.profile : null,
    lastLoginAt: user.lastLoginAt
  };

  return { token, homePage: roleHomepage, user: publicUser };
}

async function validate(email, token){
    const user = await User.findOne({ email });
    if (!user) {
        const err = new Error('Cette adresse email n\'est pas associée à un compte');
        err.status = 401;
        throw err;
    }

    if (token){
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (decoded.email !== email) {
          const err = new Error('Token invalide pour cet email');
          err.status = 401;
          throw err;
      }
    }

    return user;
}

async function change({ email, token, newPassword }) {
    const user = await validate(email, token);

    // Vérifier que le nouveau mot de passe est différent des précédents
    const history = user.passwordHistory || [];
    for (const entry of history) {
        const reused = await bcrypt.compare(newPassword, entry.passwordHash);
        if (reused) {
            const err = new Error('Le nouveau mot de passe ne doit pas être identique à un ancien mot de passe');
            err.status = 400;
            err.details = [ { field: 'newPassword', message: 'Le nouveau mot de passe doit être différent des précédents' } ];
            throw err;
        }
    }

    user.failedAttempts = 0;
    user.status = 'active';
    user.passwordHistory = [
        ...history,
        { passwordHash: await bcrypt.hash(newPassword, 10), createdAt: new Date() }
    ];
    await user.save();
    return { message: 'Mot de passe réinitialisé avec succès' };
}

async function activate(token){
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const email = decoded.email;
    const user = await validate(email, token);
    user.status = 'active';
    await user.save();
    return { message: 'Compte activé avec succès' };
}

async function reset({email}) {
  const user = await User.findOne({ email });
  const message = 'Si un compte avec cet email existe, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.';
  if (!user) {
    return { message };
  }

  // Envoyer email de réinitialisation de mot de passe
  const token = jwt.sign(
      { email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
  );

  const activationLink = getActivationLink('/new-password', { email, token: encodeURIComponent(token) } );
  try {
    await sendEmail({
      to: email,
      subject:  'Réinitialisation de votre mot de passe',
      html: `<p>Bonjour ${user.username},</p><p>Vous avez demandé une réinitialisation de mot de passe.</p><p><a href="${activationLink}">Cliquez ici pour réinitialiser votre mot de passe</a></p><p>Ce lien expirera dans <strong>${env.JWT_EXPIRES_IN}</strong>.</p>`
    });
  } catch (e) {
    logger.error('Échec d\'envoi de l\'email de réinitialisation de mot de passe', { email: user.email, error: e.message });
  }
  return { message };
}

module.exports = { register, login, reset, change, activate };
