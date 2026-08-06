// ─── Outgoing email helper (Nodemailer) ───────────────────────
// Sends an email through SMTP. If no SMTP server has been configured
// (host/user/pass empty) the send is skipped and it returns false,
// so the site keeps working while mail stays optional.
const nodemailer = require('nodemailer');
const cfg = require('./config.js');

let transportCache = null;
let cacheKey = '';

function buildTransport(smtp) {
  const host = String(smtp.host || '').trim();
  const user = String(smtp.user || '').trim();
  const pass = String(smtp.pass || '');
  if (!host || !user) return null;
  const port = Number(smtp.port) || (smtp.secure === false ? 587 : 465);
  const secure = smtp.secure === undefined ? port === 465 : !!smtp.secure;
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

// smtp = { host, port, secure, user, pass, from } — merges env defaults.
function merged(smtp) {
  const c = cfg.smtp || {};
  const m = Object.assign({}, c, smtp || {});
  return { host: m.host, port: m.port, secure: m.secure, user: m.user, pass: m.pass, from: m.from };
}

/**
 * Send an email.
 * @param {object} smtp  SMTP settings (from admin panel or env defaults)
 * @param {object} opts  { to, subject, text, html, from }
 * @returns {Promise<boolean>} true when delivered, false when skipped/failed
 */
async function sendMail(smtp, opts) {
  try {
    const s = merged(smtp);
    const transport = buildTransport(s);
    if (!transport) return false;
    const key = JSON.stringify({ host: s.host, user: s.user, pass: s.pass, port: s.port, secure: s.secure });
    if (key !== cacheKey) { transportCache = transport; cacheKey = key; }
    const from = String(opts.from || s.from || s.user || '').trim();
    const to = String(opts.to || '').trim();
    if (!from || !to) return false;
    await transportCache.sendMail({
      from, to,
      subject: String(opts.subject || '').slice(0, 150),
      text: String(opts.text || ''),
      html: String(opts.html || '')
    });
    return true;
  } catch (e) {
    console.error('mailer: send failed —', e.message);
    return false;
  }
}

module.exports = { sendMail };
