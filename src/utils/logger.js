const { env } = require('../config/env');

const levels = ['error', 'warn', 'info', 'debug'];

function log(level, ...args) {
  if (!levels.includes(level)) level = 'info';
  if (env.NODE_ENV === 'test' && level === 'debug') return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level](`[${ts}] [${level.toUpperCase()}]`, ...args);
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args)
};
