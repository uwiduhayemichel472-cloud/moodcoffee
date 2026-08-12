// ─── Paypack — Rwandan mobile-money payments ────────
// MTN MoMo / Airtel Money / Tigo Cash via paypack.rw.
// One "cashin" request pushes a prompt to the customer's phone; we confirm
// by polling /transactions/find/{ref} or the transaction:processed webhook.
const crypto = require('crypto');
const cfg = require('./config.js');

const PK = cfg.gateway.paypack;
const BASE = 'https://payments.paypack.rw/api/';
const MODE = String(PK.mode || 'development').toLowerCase() === 'production' ? 'production' : 'development';

// Access tokens last ~15 minutes — cache and refresh before expiry.
let tokenCache = null;

function configured() {
  return !!(PK.clientId && PK.clientSecret);
}

async function getToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 60000) return tokenCache.token;
  const res = await fetch(BASE + 'auth/agents/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: PK.clientId, client_secret: PK.clientSecret })
  });
  const text = await res.text();
  let j = {};
  try { j = JSON.parse(text); } catch (e) { j = {}; }
  if (!res.ok || !j.access)
    throw new Error('Payment service: could not get a Paypack token.');
  tokenCache = { token: j.access, exp: Date.now() + 14 * 60000 };
  return tokenCache.token;
}

async function pk(path, method, body, idempotencyKey) {
  const token = await getToken();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token,
    'X-Webhook-Mode': MODE
  };
  if (body) headers['Idempotency-Key'] = String(idempotencyKey || crypto.randomUUID()).slice(0, 32);
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let j = {};
  try { j = JSON.parse(text); } catch (e) { j = {}; }
  if (!res.ok) {
    const msg = (j.error && j.error.message) || j.error || j.message || j.detail || ('HTTP ' + res.status);
    throw new Error('Payment service: ' + msg);
  }
  return j;
}

// Local Rwandan format: "+250788123456" / "788123456" -> "0788123456".
function rwNumber(phone) {
  let d = String(phone || '').replace(/[^\d]/g, '');
  if (d.startsWith('250')) d = d.slice(3);
  if (!d.startsWith('0')) d = '0' + d;
  return d;
}

/**
 * Request a CASHIN (money in). Paypack pushes a prompt to the customer's
 * phone which they approve. Returns the transaction record incl. its `ref`.
 */
async function cashin({ amount, phone, idempotencyKey }) {
  const j = await pk('transactions/cashin', 'POST', {
    amount: Math.max(1, Math.round(Number(amount))),
    number: rwNumber(phone)
  }, idempotencyKey);
  if (!j.ref) throw new Error('Payment service: Paypack did not return a reference.');
  return j;
}

/**
 * Request a CASHOUT (money out). Moves money from the merchant wallet to a
 * mobile money number (e.g. the admin's own MTN/Airtel number). Returns the
 * transaction record incl. its `ref`.
 */
async function cashout({ amount, phone, idempotencyKey }) {
  const j = await pk('transactions/cashout', 'POST', {
    amount: Math.max(1, Math.round(Number(amount))),
    number: rwNumber(phone)
  }, idempotencyKey);
  if (!j.ref) throw new Error('Payment service: Paypack did not return a reference.');
  return j;
}

/** Look up a transaction by its Paypack ref. status: pending/successful/failed. */
async function find(ref) {
  return pk('transactions/find/' + encodeURIComponent(String(ref)), 'GET');
}

/** Verify the x-paypack-signature header (base64 HMAC-SHA256 of the raw body). */
function verifySignature(raw, sig) {
  if (!PK.webhookSecret) return true; // only enforced once a secret is configured
  const expected = crypto.createHmac('sha256', PK.webhookSecret).update(raw).digest('base64');
  return sig === expected;
}

module.exports = { configured, cashin, cashout, find, verifySignature };
