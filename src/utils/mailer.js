const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const logger = require('./logger');

// Crée et réutilise un transporteur SMTP basé sur les variables d'env
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

async function sendEmail({ to, subject, text, html, from }) {
  if (!to || !subject || (!text && !html)) {
    const err = new Error('Paramètres email invalides: to, subject et text/html sont requis');
    err.status = 400;
    err.details = [
      !to ? { field: 'to', message: 'Le champ to est requis' } : null,
      !subject ? { field: 'subject', message: 'Le champ subject est requis' } : null,
      !text && !html ? { field: 'content', message: 'Un des champs text ou html est requis' } : null,
    ].filter(Boolean);
    throw err;
  }

  const mailOptions = {
    from: from || env.SMTP_FROM || 'no-reply@mean.mg',
    to,
    subject,
    text,
    html,
  };

  const tp = getTransporter();
  try {
    const info = await tp.sendMail(mailOptions);
    logger.info(`Email envoyé: ${info.messageId}`);
    return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  } catch (error) {
    logger.error('Erreur d\'envoi d\'email', error);
    const err = new Error('Échec d\'envoi de l\'email');
    err.status = 500;
    err.details = [ { field: 'email', message: error.message } ];
    throw err;
  }
}

module.exports = { sendEmail };

