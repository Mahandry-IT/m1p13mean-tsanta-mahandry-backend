const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

// Crée et réutilise un transporteur SMTP basé sur les variables d'env
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    family: 4,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

async function resolveHtml({ html, htmlPath }) {
  if (html) return html;
  if (htmlPath) {
    const fullPath = path.isAbsolute(htmlPath) ? htmlPath : path.join(process.cwd(), htmlPath);
    return fs.readFileSync(fullPath, 'utf-8');
  }
  return null;
}

function applyTemplate(html, variables = {}) {
  if (!html || !variables || typeof variables !== 'object') return html;
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    const safe = String(value ?? '');
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(pattern, safe);
  }
  return result;
}

async function sendEmail({ to, subject, text, html, from, htmlPath, variables }) {
  // Résoudre le contenu HTML si non fourni directement
  let finalHtml = await resolveHtml({ html, htmlPath });
  // Appliquer les variables si présentes
  finalHtml = applyTemplate(finalHtml, variables);

  if (!to || !subject || (!text && !finalHtml)) {
    const err = new Error('Paramètres email invalides: to, subject et text/html sont requis');
    err.status = 400;
    err.details = [
      !to ? { field: 'to', message: 'Le champ to est requis' } : null,
      !subject ? { field: 'subject', message: 'Le champ subject est requis' } : null,
      !text && !finalHtml ? { field: 'content', message: 'Un des champs text, html ou htmlPath est requis' } : null,
    ].filter(Boolean);
    throw err;
  }

  const mailOptions = {
    from: from || env.SMTP_FROM || 'no-reply@mean.mg',
    to,
    subject,
    text,
    html: finalHtml || undefined,
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
