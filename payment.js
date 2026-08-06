// ─── Flutterwave v4 online payments ────────────────
// Powers MTN MoMo, Airtel Money and card payments using the v4
// Orchestrator flow (one request creates customer + payment method +
// charge). v4 authenticates with OAuth2 (Client ID + Client Secret)
// instead of static API keys.
const crypto = require('crypto');
const cfg = require('./config.js');

const FLW = cfg.gateway.flutterwave;
const BASE = FLW.env === 'live'
  ? 'https://f4bexperience.flutterwave.com'
  : 'https://developersandbox-api.flutterwave.com';
const TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';

// Access tokens expire after 10 minutes — cache and refresh before expiry.
let tokenCache = null;
const uuid = () => crypto.randomUUID();

function configured() {
  return !!(FLW.clientId && FLW.clientSecret);
}

async function getToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 60000) return tokenCache.token;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FLW.clientId,
      client_secret: FLW.clientSecret,
      grant_type: 'client_credentials'
    })
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token)
    throw new Error('Payment service: could not get access token.');
  tokenCache = { token: j.access_token, exp: Date.now() + Number(j.expires_in || 600) * 1000 };
  return tokenCache.token;
}

async function flw(path, method, body, extraHeaders) {
  const token = await getToken();
  const res = await fetch(BASE + path, {
    method,
    headers: Object.assign({
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'X-Trace-Id': uuid(),
      'X-Idempotency-Key': uuid()
    }, extraHeaders || {}),
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let j = {};
  try { j = JSON.parse(text); } catch (e) { j = {}; }
  if (!res.ok) {
    const msg = (j.error && (j.error.message || j.error.type)) || j.message || ('HTTP ' + res.status);
    throw new Error('Payment service: ' + msg);
  }
  return j;
}

// In the sandbox, scenario keys let us walk through a redirect page and
// simulate an approved payment. Live mode never sends them.
function scenarioKey(method) {
  if (FLW.env !== 'test') return undefined;
  if (method === 'card') return 'scenario:auth_3ds&issuer:approved';
  return 'scenario:auth_redirect'; // mobile-money redirect page in sandbox
}

// Turn "+250 788 123 456", "0788123456" or "788123456" into "788123456".
function rwPhone(p) {
  let d = String(p || '').replace(/[^\d]/g, '');
  if (d.startsWith('250')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}

/**
 * Create a payment charge via the v4 orchestrator and return where the
 * customer must go next (a redirect URL or a phone-prompt instruction).
 *
 * customer.method  -> 'mtn' | 'airtel' | 'card'
 * customer.card    -> { nonce, encrypted_card_number, encrypted_expiry_month,
 *                       encrypted_expiry_year, encrypted_cvv } (for cards)
 */
async function createPaymentLink({ amount, currency, tx_ref, customer, description }) {
  const method = String(customer.method || 'mtn').toLowerCase();
  const email = String(customer.email || '').trim();
  const nameBits = String(customer.name || '').trim().split(/\s+/);
  const first = nameBits[0] || 'Customer';
  const last = nameBits.slice(1).join(' ') || first;
  const ccode = '250';
  const phone = rwPhone(customer.phone);

  let paymentMethod;
  if (method === 'card') {
    const card = customer.card || {};
    if (!card.nonce || !card.encrypted_card_number)
      throw new Error('Payment service: card details are missing.');
    paymentMethod = {
      type: 'card',
      card: {
        nonce: card.nonce,
        encrypted_card_number: card.encrypted_card_number,
        encrypted_expiry_month: card.encrypted_expiry_month,
        encrypted_expiry_year: card.encrypted_expiry_year,
        encrypted_cvv: card.encrypted_cvv
      }
    };
  } else {
    paymentMethod = {
      type: 'mobile_money',
      mobile_money: {
        country_code: ccode,
        network: method === 'airtel' ? 'AIRTEL' : 'MTN',
        phone_number: phone
      }
    };
  }

  const body = {
    amount,
    currency,
    reference: tx_ref,
    redirect_url: FLW.baseUrl + '/api/pay/return?ref=' + encodeURIComponent(tx_ref),
    customer: {
      email,
      name: { first, last },
      phone: { country_code: ccode, number: phone }
    },
    payment_method: paymentMethod
  };
  const sk = scenarioKey(method);
  const j = await flw('/orchestration/direct-charges', 'POST', body,
    sk ? { 'X-Scenario-Key': sk } : undefined);
  const d = j.data || {};
  if (!d.id) throw new Error('Payment service: could not create the charge.');
  const na = d.next_action || {};
  const url = (na.type === 'redirect_url' && na.redirect_url && na.redirect_url.url) || '';
  const note = (na.type === 'payment_instruction' && na.payment_instruction && na.payment_instruction.note) || '';
  return { url, instruction: note, chargeId: d.id };
}

/**
 * Verify a charge server-side before accepting it. Returns the charge
 * object (see Flutterwave v4 retrieve-a-charge API).
 */
async function verifyTransaction(txId) {
  const j = await flw('/charges/' + encodeURIComponent(String(txId)), 'GET');
  if (!j.data) throw new Error('Payment service: charge not found.');
  return j.data;
}

module.exports = { configured, createPaymentLink, verifyTransaction };
