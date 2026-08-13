// ─── Wallet ledger — money control panel backbone ──
// Every money movement (money-in from paid orders / counter cash, money-out
// from paypack cashouts / expenses) is recorded here so the admin gets a
// single, auditable view of the shop's money with a running balance.
const { q } = require('./db.js');

const METHODS = {
  in:  ['mtn', 'airtel', 'tigo', 'card', 'cash', 'paypal'],
  out: ['cash', 'airtel', 'mtn', 'card', 'bank', 'paypack', 'manual']
};
const VALID_IN = METHODS.in;
const VALID_OUT = METHODS.out;

// Is an order/gateway ref already logged? (guards against double-counting)
async function hasLog(ref, txType) {
  if (!ref) return false;
  const rows = await q('SELECT id FROM wallet_tx WHERE ref=? AND tx_type=?', [String(ref).slice(0, 40), txType]);
  return rows.length > 0;
}

// Record money coming IN to the shop. status: 'successful' (default) for money
// already received, or 'pending' for COD that isn't paid yet.
async function logIn({ ref, method = 'cash', amount, note = '', status = 'successful', by = null }) {
  if (!VALID_IN.includes(method)) method = 'cash';
  const amt = Math.round(Number(amount || 0) * 100) / 100;
  if (amt <= 0) return null;
  const r = await q('INSERT INTO wallet_tx (tx_type,method,amount,note,ref,status,created_by) VALUES (?,?,?,?,?,?,?)',
    ['in', method, amt, String(note || '').slice(0, 255), String(ref || '').slice(0, 40) || null, status, by || null]);
  return r.insertId;
}

// Record money going OUT of the shop (cashout, expense, refund…).
async function logOut({ ref, method = 'cash', amount, note = '', status = 'successful', by = null }) {
  if (!VALID_OUT.includes(method)) method = 'cash';
  const amt = Math.round(Number(amount || 0) * 100) / 100;
  if (amt <= 0) return null;
  const r = await q('INSERT INTO wallet_tx (tx_type,method,amount,note,ref,status,created_by) VALUES (?,?,?,?,?,?,?)',
    ['out', method, amt, String(note || '').slice(0, 255), String(ref || '').slice(0, 40) || null, status, by || null]);
  return r.insertId;
}

// Wallet balance + totals, with an optional method filter.
async function summary({ method = '', since = '' } = {}) {
  const where = [];
  const vals = [];
  if (method) { where.push('method=?'); vals.push(method); }
  if (since) { where.push('created_at >= ?'); vals.push(since); }
  const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const rows = await q(`SELECT tx_type, COALESCE(SUM(amount),0) s, COUNT(*) n FROM wallet_tx${w} GROUP BY tx_type`);
  let inn = 0, out = 0, nIn = 0, nOut = 0;
  rows.forEach(r => { if (r.tx_type === 'in') { inn = Number(r.s); nIn = r.n; } else { out = Number(r.s); nOut = r.n; } });
  return { balance: Math.round((inn - out) * 100) / 100, in: inn, out: out, nIn, nOut };
}

// Money in/out broken down by method (for the panel + CSV breakdown).
async function byMethod({ txType = '', since = '' } = {}) {
  const w = [];
  const vals = [];
  if (txType) { w.push('tx_type=?'); vals.push(txType); }
  if (since) { w.push('created_at >= ?'); vals.push(since); }
  const where = w.length ? ' WHERE ' + w.join(' AND ') : '';
  const rows = await q(`SELECT method, COALESCE(SUM(amount),0) s, COUNT(*) n FROM wallet_tx${where} GROUP BY method ORDER BY s DESC`, vals);
  return rows.map(r => ({ method: r.method, amount: Number(r.s), count: r.n }));
}

// Recent ledger rows.
async function list({ limit = 200, offset = 0, txType = '', method = '' } = {}) {
  const w = [];
  const vals = [];
  if (txType) { w.push('tx_type=?'); vals.push(txType); }
  if (method) { w.push('method=?'); vals.push(method); }
  const where = w.length ? ' WHERE ' + w.join(' AND ') : '';
  const rows = await q(`SELECT w.*, a.name recorded_by FROM wallet_tx w
    LEFT JOIN admins a ON a.id=w.created_by${where}
    ORDER BY w.created_at DESC, w.id DESC LIMIT ? OFFSET ?`, vals.concat([Number(limit) || 200, Number(offset) || 0]));
  return rows;
}

// CSV export of the whole ledger.
async function csv() {
  const rows = await q('SELECT w.*, a.name recorded_by FROM wallet_tx w LEFT JOIN admins a ON a.id=w.created_by ORDER BY w.created_at DESC, w.id DESC');
  const fmt = v => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const esc = v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = ['date', 'type', 'method', 'amount', 'note', 'ref', 'status', 'recorded_by'];
  const lines = rows.map(w => [
    fmt(w.created_at), w.tx_type, w.method, Number(w.amount).toFixed(2), w.note, w.ref || '', w.status, w.recorded_by || ''
  ].map(esc).join(','));
  return head.join(',') + '\n' + lines.join('\n');
}

module.exports = { METHODS, VALID_IN, VALID_OUT, hasLog, logIn, logOut, summary, byMethod, list, csv };
