// ─── Flutterwave online payments ─────────────────────
// Powers MTN MoMo, Airtel Money and card payments through the
// Flutterwave hosted payment page. Runs in TEST mode automatically
// when a FLWSECK_TEST key is used (set FLW_SECRET_KEY env var).
const cfg = require('./config.js');

const FLW = cfg.gateway.flutterwave;
const API = 'https://api.flutterwave.com/v3';

// Map the store's payment methods to Flutterwave's method codes.
// (Airtel Rwanda is not a separate Flutterwave method yet, so Airtel
//  and MTN both use the Rwanda mobile-money channel on the hosted page.)
const METHODS = {
  card:   ['card'],
  mtn:    ['mobilemoneyrwanda'],
  airtel: ['mobilemoneyrwanda'],
  paypal: ['card']
};

function configured() {
  return !!(FLW.secret && FLW.public);
}
function publicKey() {
  return FLW.public;
}

async function flw(path, method, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + FLW.secret,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

/**
 * Create a hosted payment page and return its URL.
 * amount is the total to charge, currency e.g. 'RWF' or 'USD'.
 */
async function createPaymentLink({ amount, currency, tx_ref, customer, description }) {
  const body = {
    amount,
    currency,
    tx_ref,
    customer: {
      email: String(customer.email || '').trim(),
      name: String(customer.name || '').trim(),
      phonenumber: String(customer.phone || '').trim()
    },
    redirect_url: FLW.baseUrl + '/api/pay/verify',
    customizations: {
      title: 'MOOD Coffee Shop & Bakery',
      description: description || 'Order ' + tx_ref
    }
  };
  const methods = METHODS[String(customer.method || '').toLowerCase()];
  if (methods && methods.length) body.payment_methods = methods;
  const j = await flw('/payment-links', 'POST', body);
  if (j.status !== 'success' || !j.data || !j.data.link) {
    throw new Error('Payment service: ' + (j.message || 'could not create payment.'));
  }
  return j.data.link;
}

/**
 * Verify a completed transaction server-side before accepting it.
 * Returns the transaction object (see Flutterwave verify API).
 */
async function verifyTransaction(txId) {
  const j = await flw('/transactions/' + txId + '/verify', 'GET');
  if (j.status !== 'success' || !j.data) {
    throw new Error('Payment service: transaction ' + txId + ' not found.');
  }
  return j.data;
}

module.exports = { configured, publicKey, createPaymentLink, verifyTransaction };
