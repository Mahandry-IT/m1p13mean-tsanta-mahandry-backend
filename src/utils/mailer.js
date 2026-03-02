const nodemailer = require('nodemailer');
const Mailjet = require('node-mailjet');
const { env } = require('../config/env');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

let transporter;
function getSmtpTransporter() {
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

let mailjetClient;
function getMailjetClient() {
  if (mailjetClient) return mailjetClient;
  if (!env.MAILJET_API_KEY || !env.MAILJET_API_SECRET) {
    const err = new Error('Configuration Mailjet manquante: MAILJET_API_KEY et MAILJET_API_SECRET sont requis');
    err.status = 500;
    throw err;
  }
  mailjetClient = Mailjet.apiConnect(env.MAILJET_API_KEY, env.MAILJET_API_SECRET);
  return mailjetClient;
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

function normalizeTo(to) {
  if (Array.isArray(to)) return to.filter(Boolean).map(String);
  if (typeof to === 'string') {
    // Support: "a@x.com, b@y.com"
    return to.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

async function sendWithSmtp({ to, subject, text, html, from }) {
  const mailOptions = {
    from: from || env.SMTP_FROM || 'no-reply@mean.mg',
    to,
    subject,
    text,
    html: html || undefined,
  };

  const tp = getSmtpTransporter();
  const info = await tp.sendMail(mailOptions);
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

async function sendWithMailjet({ to, subject, text, html, from }) {
  const recipients = normalizeTo(to);
  if (!recipients.length) {
    const err = new Error('Paramètre email invalide: to est requis');
    err.status = 400;
    throw err;
  }

  const fromEmail = (from || env.MAILJET_FROM_EMAIL || env.SMTP_FROM || 'no-reply@mean.mg');
  const fromName = env.MAILJET_FROM_NAME || 'MEAN';

  const payload = {
    Messages: [
      {
        From: { Email: fromEmail, Name: fromName },
        To: recipients.map(email => ({ Email: email })),
        Subject: subject,
        TextPart: text || undefined,
        HTMLPart: html || undefined,
      }
    ]
  };

  const client = getMailjetClient();
  const res = await client.post('send', { version: 'v3.1' }).request(payload);

  // Mailjet répond avec une structure détaillée; on renvoie une forme proche de l'ancien contrat
  const messageId = res?.body?.Messages?.[0]?.To?.[0]?.MessageID;
  const accepted = recipients;
  const rejected = [];
  return { messageId, accepted, rejected, provider: 'mailjet' };
}

async function sendEmail({ to, subject, text, html, from, htmlPath, variables }) {
  let finalHtml = await resolveHtml({ html, htmlPath });
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

  try {
    const provider = (env.EMAIL_PROVIDER || 'mailjet').toLowerCase();
    if (provider === 'smtp') {
      const info = await sendWithSmtp({ to, subject, text, html: finalHtml, from });
      logger.info(`Email envoyé (smtp): ${info.messageId}`);
      return info;
    }

    const info = await sendWithMailjet({ to, subject, text, html: finalHtml, from });
    logger.info(`Email envoyé (mailjet): ${info.messageId || 'ok'}`);
    return info;
  } catch (error) {
    // node-mailjet expose souvent statusCode + response
    const detailsMsg = error?.response?.data || error?.message;
    logger.error("Erreur d'envoi d'email", { error: detailsMsg });
    const err = new Error("Échec d'envoi de l'email");
    err.status = 500;
    err.details = [ { field: 'email', message: error.message } ];
    throw err;
  }
}

module.exports = { sendEmail };
