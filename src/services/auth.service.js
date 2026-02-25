const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const Token = require('../models/token.model');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/mailer');

function getActivationLink(path, field, value) {
  const origin = (env.CORS_ORIGINS && env.CORS_ORIGINS[0]) || ('http://localhost:' + env.PORT);
  const base = origin.replace(/\/$/, '');
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

  // Enregistrer le token d'activation en base
  const decodedReg = jwt.decode(token);
  const expiredAtReg = decodedReg?.exp ? new Date(decodedReg.exp * 1000) : new Date(Date.now() + 3600 * 1000);
  await Token.create({ userId: user._id, type: 'activation', token, expiredAt: expiredAtReg, isActive: true });

  // Envoyer email d'activation
  const activationLink = getActivationLink('/auth/activate', { email, token: encodeURIComponent(token) }, encodeURIComponent(token));
  try {
    await sendEmail({
      to: user.email,
      subject: 'Activation de votre compte.',
      htmlPath: 'templates/activation.html',
      variables: {
        title: 'Activation de votre compte',
        message: 'Merci de vous être inscrit auprès de nous ! Nous sommes ravis de vous accueillir. Pour commencer à utiliser votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.',
        appName: 'MEAN',
        username: user.username,
        activationLink,
        expiration: env.JWT_EXPIRES_IN,
        year: new Date().getFullYear()
      }
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

    const activationLink = getActivationLink('/auth/new-password', { email, token: encodeURIComponent(token) } );
    try {
      await sendEmail({
        to: user.email,
        subject: 'Réactivation de votre compte',
        htmlPath: 'templates/activation.html',
        variables: {
          title: 'Réactivation de votre compte',
          message: 'Suite à un nombre élevé de tentatives de connexion infructueuses, votre compte a été temporairement désactivé pour des raisons de sécurité. Pour réactiver votre compte, veuillez cliquer sur le bouton ci-dessous.',
          appName: 'MEAN',
          username: user.username,
          activationLink,
          expiration: env.JWT_EXPIRES_IN,
          year: new Date().getFullYear()
        }
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
    { token, expiredAt, isActive: true }
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

// Helper: vérifier qu'un jeton est actif et non expiré en base pour un type donné
async function verifyTokenRecord({ email, token, type }) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Cette adresse email n\'est pas associée à un compte');
    err.status = 401;
    throw err;
  }
  const record = await Token.findOne({ userId: user._id, type, token, isActive: true });
  if (!record) {
    const err = new Error('Votre lien est invalide ou a déjà été utilisé');
    err.status = 401;
    throw err;
  }
  if (record.expiredAt && record.expiredAt <= new Date()) {
    const err = new Error('Votre lien a expiré, veuillez recommencer la procédure');
    err.status = 401;
    throw err;
  }
  return { user, record };
}

async function validate(email, token){
    // Validation JWT standard (signature, email)
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.email !== email) {
      const err = new Error('Token invalide pour cet email');
      err.status = 401;
      throw err;
    }
    // Vérifier en base que le token de type reset est actif et non expiré
    const { user } = await verifyTokenRecord({ email, token, type: 'password_reset' });
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

    // Invalider le token de reset après utilisation
    await Token.updateOne({ userId: user._id, type: 'password_reset', token }, { $set: { isActive: false } });

    return { message: 'Mot de passe réinitialisé avec succès' };
}

async function activate(token){
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const email = decoded.email;

    // Vérifier en base que le token d'activation est actif et non expiré
    const { user, record } = await verifyTokenRecord({ email, token, type: 'activation' });

    user.status = 'active';
    await user.save();

    // Invalider le token d'activation après utilisation
    await Token.updateOne({ _id: record._id }, { $set: { isActive: false } });

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

  // Enregistrer le token de reset en base
  const decodedReset = jwt.decode(token);
  const expiredAtReset = decodedReset?.exp ? new Date(decodedReset.exp * 1000) : new Date(Date.now() + 3600 * 1000);
  await Token.create({ userId: user._id, type: 'password_reset', token, expiredAt: expiredAtReset, isActive: true });

  const activationLink = getActivationLink('/auth/reset-password', { email, token: encodeURIComponent(token) } );
  try {
    await sendEmail({
      to: email,
      subject:  'Réinitialisation de votre mot de passe',
      htmlPath: 'templates/activation.html',
      variables: {
        title: 'Réinitialisation de votre mot de passe',
        message: 'Suite à une demande de réinitialisation de mot de passe, veuillez cliquer sur le bouton ci-dessous pour choisir un nouveau mot de passe pour votre compte.',
        appName: 'MEAN',
        username: user.username,
        activationLink,
        expiration: env.JWT_EXPIRES_IN,
        year: new Date().getFullYear()
      }
    });
  } catch (e) {
    logger.error('Échec d\'envoi de l\'email de réinitialisation de mot de passe', { email: user.email, error: e.message });
  }
  return { message };
}

async function logout(token) {
  if (!token) {
    const err = new Error('Token manquant dans l\'entête de la requête');
    err.status = 401;
    throw err;
  }
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (e) {
    const err = new Error('Votre token est invalide, veuillez vous reconnecter');
    err.status = 401;
    throw err;
  }
  const user = await User.findOne({ email: payload.email });
  if (!user) {
    const err = new Error('Utilisateur introuvable pour ce token, veuillez vous reconnecter');
    err.status = 401;
    throw err;
  }
  // Trouver la session correspondante et la désactiver
  const sessions = user.sessions || [];
  const idx = sessions.findIndex(s => s.token === token && s.isActive);
  if (idx === -1) {
    const err = new Error('Votre session n\'est pas active ou a déjà été fermée, veuillez vous reconnecter');
    err.status = 400;
    throw err;
  }
  sessions[idx].isActive = false;
  user.sessions = sessions;
  await user.save();
  return { message: 'Déconnexion réussie' };
}

async function purgeExpired() {
  const now = new Date();
  // Désactiver sessions expirées encore actives
  const users = await User.find({ 'sessions.isActive': true, 'sessions.expiredAt': { $lte: now } });
  let disabledSessions = 0;
  for (const user of users) {
    const sessions = (user.sessions || []).map(s => {
      if (s.isActive && s.expiredAt && new Date(s.expiredAt) <= now) {
        disabledSessions += 1;
        return { ...s.toObject?.() ?? s, isActive: false };
      }
      return s;
    });
    user.sessions = sessions;
    await user.save();
  }

  // Désactiver tokens expirés encore actifs
  const res = await Token.updateMany({ isActive: true, expiredAt: { $lte: now } }, { $set: { isActive: false } });
  const disabledTokens = res.modifiedCount || 0;

  return { disabledSessions, disabledTokens };
}

module.exports = { register, login, reset, change, activate, logout, purgeExpired };
