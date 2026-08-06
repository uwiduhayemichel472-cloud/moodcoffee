// ─── Security & auth helpers ────────────────────────
const crypto = require('crypto');
const cfg = require('./config.js');
const { q } = require('./db.js');

// --- Password hashing (Node built-in scrypt, no extra deps) ---
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(String(pw), salt, 64).toString('hex');
}
function verifyPassword(pw, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 2) return false;
  const buf = crypto.scryptSync(String(pw), parts[0], 64);
  const a = Buffer.from(parts[1], 'hex');
  return buf.length === a.length && crypto.timingSafeEqual(buf, a);
}

// --- Cookies ---
function getCookies(req) {
  const out = {};
  const h = req.headers.cookie;
  if (h) h.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setCookie(res, name, token, maxAge) {
  let c = `${name}=${token}; HttpOnly; Path=/; SameSite=${cfg.cookies.sameSite}; Max-Age=${maxAge}`;
  if (cfg.cookies.secure) c += '; Secure';
  res.setHeader('Set-Cookie', c);
}
function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; HttpOnly; Path=/; SameSite=${cfg.cookies.sameSite}; Max-Age=0`);
}

// --- Session fingerprint: binds a session to the device that logged in.
// --- A copied URL/cookie no longer works from another browser, IP or device.
function clientIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  let ip = fwd ? String(fwd).split(',')[0].trim() : (req.socket.remoteAddress || '');
  return ip.replace(/^::ffff:/, ''); // normalise IPv4-mapped IPv6
}
function clientUA(req) { return String(req.headers['user-agent'] || '').slice(0, 255); }
function fp(ip, ua) { return crypto.createHash('sha256').update(ip + '|' + ua).digest('hex'); }

// --- Sessions (token stored in MySQL, survives restarts) ---
async function issueSession(res, type, userId, req) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + cfg.sessTTL);
  const exp = expires.toISOString().slice(0, 19).replace('T', ' ');
  const ip = clientIP(req || {}), ua = clientUA(req || {});
  await q('INSERT INTO sessions (token,user_type,user_id,expires_at,ip,ua) VALUES (?,?,?,?,?,?)',
    [token, type, userId, exp, ip, ua]);
  setCookie(res, type === 'admin' ? cfg.cookies.admin : cfg.cookies.customer, token, cfg.sessTTL / 1000);
  return token;
}
async function getSession(req, type) {
  const c = getCookies(req);
  const tok = c[type === 'admin' ? cfg.cookies.admin : cfg.cookies.customer];
  if (!tok) return null;
  const rows = await q('SELECT user_id, expires_at, last_active, ip, ua FROM sessions WHERE token=? AND user_type=?', [tok, type]);
  if (!rows.length) return null;
  // Device check: reject and destroy the session if it is being used from a
  // different browser/IP than the one that originally logged in.
  const want = fp(clientIP(req), clientUA(req));
  if (rows[0].ip && rows[0].ua && want !== fp(rows[0].ip, rows[0].ua)) {
    await q('DELETE FROM sessions WHERE token=?', [tok]);
    return null;
  }
  if (new Date(rows[0].expires_at).getTime() < Date.now()) {
    await q('DELETE FROM sessions WHERE token=?', [tok]);
    return null;
  }
  return { token: tok, id: rows[0].user_id, last_active: rows[0].last_active };
}
async function logout(res, req, type) {
  const cookie = type === 'admin' ? cfg.cookies.admin : cfg.cookies.customer;
  const c = getCookies(req || {});
  const tok = c[cookie];
  if (tok) await q('DELETE FROM sessions WHERE token=?', [tok]); // destroy the token server-side too
  clearCookie(res, cookie);
}
async function purgeExpired() {
  try { await q("DELETE FROM sessions WHERE expires_at < NOW()"); } catch (e) { /* ignore */ }
}

// --- Auth middleware ---
async function requireCustomer(req, res, next) {
  const s = await getSession(req, 'customer');
  if (!s) return res.status(401).json({ error: 'Please login first.' });
  const rows = await q('SELECT id,name,email,phone,points,created_at FROM customers WHERE id=?', [s.id]);
  if (!rows.length) return res.status(401).json({ error: 'Account not found.' });
  req.user = rows[0];
  req.sess = s;
  next();
}
async function requireAdmin(req, res, next) {
  const s = await getSession(req, 'admin');
  if (!s) return res.status(401).json({ error: 'Admin login required.' });
  const rows = await q('SELECT id,name,email,role,permissions,status FROM admins WHERE id=?', [s.id]);
  if (!rows.length) return res.status(401).json({ error: 'Admin not found.' });
  const a = rows[0];
  if (a.status !== 1) {
    await q('DELETE FROM sessions WHERE token=?', [s.token]);
    return res.status(403).json({ error: 'This account has been disabled by the super admin.' });
  }
  const st = await q('SELECT lock_minutes FROM settings WHERE id=1');
  const lockMs = Math.max(1, Number((st[0] && st[0].lock_minutes) || 5)) * 60000;
  if (s.last_active && Date.now() - new Date(s.last_active).getTime() > lockMs) {
    await q('DELETE FROM sessions WHERE token=?', [s.token]);
    return res.status(401).json({ error: 'Session expired due to inactivity. Please sign in again.' });
  }
  await q('UPDATE sessions SET last_active=NOW() WHERE token=?', [s.token]);
  let perms = [];
  try { perms = JSON.parse(a.permissions || '[]'); } catch (e) { perms = []; }
  const isSuper = a.role === 'superadmin';
  req.admin = {
    id: a.id, name: a.name, email: a.email, role: a.role,
    perms: isSuper ? [] : perms, isSuper, lockMs
  };
  req.sess = s;
  next();
}

// --- CSRF defense: reject cross-origin state changes ---
function csrf(req, res, next) {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return next();
  const o = req.headers.origin;
  if (!o) return next(); // no Origin = non-browser client, cannot be CSRF
  const proto = req.headers['x-forwarded-proto'] || (cfg.cookies.secure ? 'https' : 'http');
  if (o === proto + '://' + req.headers.host) return next();
  return res.status(403).json({ error: 'Cross-site request blocked.' });
}

// --- Simple brute-force limiter ---
const attempts = {};
function rateLimit(ip, key, max, windowMs) {
  const k = ip + '|' + key;
  const now = Date.now();
  const a = attempts[k];
  if (!a || a.reset < now) { attempts[k] = { n: 1, reset: now + windowMs }; return true; }
  a.n++;
  return a.n <= max;
}
function resetAttempts(ip, key) { delete attempts[ip + '|' + key]; }
setInterval(() => { for (const k in attempts) if (attempts[k].reset < Date.now()) delete attempts[k]; }, 60000);

// --- Notification helper ---
async function notify(msg) {
  try { await q('INSERT INTO notifications (message) VALUES (?)', [String(msg).slice(0, 500)]); } catch (e) { /* ignore */ }
}

module.exports = {
  hashPassword, verifyPassword, getCookies, setCookie, clearCookie, issueSession, getSession, logout,
  purgeExpired, requireCustomer, requireAdmin, csrf, rateLimit, resetAttempts, notify
};
