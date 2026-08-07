// ─── Admin API — mounted at /api/admin, requires admin session ───
const express = require('express');
const { q } = require('./db.js');
const H = require('./helpers.js');

const r = express.Router();
const money = v => Number(v || 0).toFixed(2);
const VALID_STATUS = ['Preparing', 'Delivered', 'Pending', 'Cancelled'];
const VALID_PAY = ['paypal', 'mtn', 'airtel', 'card'];

// Whether any admin exists yet (public — drives the setup screen)
r.get('/status', async (req, res) => {
  try {
    const admins = await q('SELECT id FROM admins LIMIT 1');
    res.json({ setup: !admins.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Setup (first admin only, no hardcoded credentials) ----------
r.post('/setup', async (req, res) => {
  try {
    const admins = await q('SELECT id FROM admins LIMIT 1');
    if (admins.length) return res.status(403).json({ error: 'Setup already done.' });
    const { name = '', email = '', password = '' } = req.body;
    if (!name.trim() || !email.includes('@') || password.length < 6)
      return res.status(400).json({ error: 'Enter a name, valid email and a 6+ character password.' });
    const rr = await q('INSERT INTO admins (name,email,pass_hash,role,permissions) VALUES (?,?,?,?,?)',
      [name.trim(), email.toLowerCase(), H.hashPassword(password), 'superadmin', '[]']);
    await H.issueSession(res, 'admin', rr.insertId, req);
    await q('UPDATE admins SET last_login=NOW() WHERE id=?', [rr.insertId]);
    res.json({ admin: { id: rr.insertId, name: name.trim(), email: email.toLowerCase(), role: 'superadmin', perms: [], isSuper: true, lockMs: 5 * 60000 } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/login', async (req, res) => {
  try {
    const { email = '', password = '' } = req.body;
    if (!H.rateLimit(req.ip, 'adm-login', 8, 60000))
      return res.status(429).json({ error: 'Too many attempts. Try later.' });
    const rows = await q('SELECT * FROM admins WHERE email=?', [email.toLowerCase()]);
    if (!rows.length || !H.verifyPassword(password, rows[0].pass_hash))
      return res.status(401).json({ error: 'Incorrect admin email or password.' });
    if (rows[0].status !== 1)
      return res.status(403).json({ error: 'This account has been disabled by the super admin.' });
    await H.issueSession(res, 'admin', rows[0].id, req);
    await q('UPDATE admins SET last_login=NOW() WHERE id=?', [rows[0].id]);
    const st = await q('SELECT lock_minutes FROM settings WHERE id=1');
    const lockMs = Math.max(1, Number((st[0] && st[0].lock_minutes) || 5)) * 60000;
    const a = rows[0];
    let perms = [];
    try { perms = JSON.parse(a.permissions || '[]'); } catch (e) { perms = []; }
    const isSuper = a.role === 'superadmin';
    res.json({ admin: { id: a.id, name: a.name, email: a.email, role: a.role, perms: isSuper ? [] : perms, isSuper, lockMs } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/logout', async (req, res) => { await H.logout(res, req, 'admin'); res.json({ ok: true }); });

r.post('/change-password', H.requireAdmin, async (req, res) => {
  try {
    const cur = String(req.body.current || '');
    const next = String(req.body.password || '');
    if (next.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    const rows = await q('SELECT pass_hash FROM admins WHERE id=?', [req.admin.id]);
    if (!rows.length || !H.verifyPassword(cur, rows[0].pass_hash))
      return res.status(401).json({ error: 'Current password is incorrect.' });
    await q('UPDATE admins SET pass_hash=? WHERE id=?', [H.hashPassword(next), req.admin.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.get('/me', H.requireAdmin, (req, res) => res.json({ admin: req.admin }));

// ---------- Protected routes below ----------
r.use(H.requireAdmin);

const ALL_PERMS = ['overview', 'products', 'categories', 'orders', 'customers', 'promos', 'settings', 'notifications', 'reports', 'reviews', 'reservations', 'giftcards'];
function perm(...keys) {
  return (req, res, next) => {
    if (req.admin.isSuper) return next();
    if (!keys.every(k => req.admin.perms.includes(k)))
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    next();
  };
}
function superOnly(req, res, next) {
  if (!req.admin.isSuper) return res.status(403).json({ error: 'Only the super admin can do that.' });
  next();
}

r.get('/stats', perm('overview'), async (req, res) => {
  try {
    const rev = await q('SELECT COALESCE(SUM(total),0) s, COUNT(*) n FROM orders');
    const cust = await q('SELECT COUNT(*) n FROM customers');
    const prod = await q('SELECT COUNT(*) n FROM products');
    const prodA = await q('SELECT COUNT(*) n FROM products WHERE available=1');
    const tod = await q("SELECT COUNT(*) n FROM orders WHERE DATE(created_at)=CURDATE()");
    const week = await q(`SELECT DATE(created_at) d, COALESCE(SUM(total),0) s FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at)`);
    const cats = await q('SELECT c.name, COUNT(p.id) n FROM categories c LEFT JOIN products p ON p.cat_id=c.id GROUP BY c.id');
    const recentOrd = await q('SELECT o.*, COALESCE(cu.name,o.customer_name) customer FROM orders o LEFT JOIN customers cu ON cu.id=o.user_id ORDER BY o.created_at DESC LIMIT 5');
    const notifs = await q('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 8');
    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dayMap[d] = { label: new Date(d).toLocaleDateString('en', { weekday: 'short' }), value: 0 };
    }
    week.forEach(w => { if (dayMap[new Date(w.d).toISOString().slice(0, 10)]) dayMap[new Date(w.d).toISOString().slice(0, 10)].value = Number(w.s); });
    res.json({
      revenue: Number(rev[0].s), orders: rev[0].n, customers: cust[0].n,
      products: prod[0].n, productsActive: prodA[0].n, ordersToday: tod[0].n,
      chart: Object.values(dayMap), cats: cats.map(c => ({ name: c.name, n: c.n })),
      recentOrders: recentOrd, notifications: notifs
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Products ----------
r.get('/products', perm('products'), async (req, res) => {
  try {
    const rows = await q(`SELECT p.*, c.name cat FROM products p JOIN categories c ON c.id=p.cat_id ORDER BY p.id`);
    res.json(rows.map(p => ({
      id: p.id, catId: p.cat_id, cat: p.cat, name: p.name, desc: p.description,
      price: Number(p.price), emoji: p.emoji, img: p.image, avail: p.available, feat: p.featured
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function cleanProd(b) {
  const name = String(b.name || '').trim();
  const catId = Number(b.catId);
  const price = Number(b.price);
  if (!name || !catId || isNaN(price) || price < 0) return null;
  return {
    name, cat_id: catId, price,
    description: String(b.desc || '').slice(0, 500),
    emoji: String(b.emoji || '☕').slice(0, 8),
    image: String(b.img || '').slice(0, 300000),
    available: b.avail ? 1 : 0,
    featured: b.feat ? 1 : 0
  };
}

r.post('/products', perm('products'), async (req, res) => {
  try {
    const p = cleanProd(req.body);
    if (!p) return res.status(400).json({ error: 'Check name, category and price.' });
    const rr = await q('INSERT INTO products (cat_id,name,description,price,emoji,image,available,featured) VALUES (?,?,?,?,?,?,?,?)',
      [p.cat_id, p.name, p.description, p.price, p.emoji, p.image, p.available, p.featured]);
    H.notify('Product added: ' + p.name);
    res.json({ id: rr.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put('/products/:id', perm('products'), async (req, res) => {
  try {
    const p = cleanProd(req.body);
    if (!p) return res.status(400).json({ error: 'Check name, category and price.' });
    await q('UPDATE products SET cat_id=?,name=?,description=?,price=?,emoji=?,image=?,available=?,featured=? WHERE id=?',
      [p.cat_id, p.name, p.description, p.price, p.emoji, p.image, p.available, p.featured, Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.patch('/products/:id', perm('products'), async (req, res) => {
  try {
    const b = req.body;
    const upd = [];
    const vals = [];
    if (b.available !== undefined) { upd.push('available=?'); vals.push(b.available ? 1 : 0); }
    if (b.featured !== undefined) { upd.push('featured=?'); vals.push(b.featured ? 1 : 0); }
    if (!upd.length) return res.status(400).json({ error: 'Nothing to update.' });
    vals.push(Number(req.params.id));
    await q('UPDATE products SET ' + upd.join(',') + ' WHERE id=?', vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.delete('/products/:id', perm('products'), async (req, res) => {
  try { await q('DELETE FROM products WHERE id=?', [Number(req.params.id)]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Categories ----------
r.get('/categories', perm('categories'), async (req, res) => {
  try {
    const rows = await q(`SELECT c.*, COUNT(p.id) count FROM categories c
      LEFT JOIN products p ON p.cat_id=c.id GROUP BY c.id ORDER BY c.sort, c.id`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/categories', perm('categories'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Enter a category name.' });
    const service = req.body.service === 'bakery' ? 'bakery' : 'coffee';
    await q('INSERT INTO categories (name,image,service) VALUES (?,?,?)', [name, String(req.body.image || '').slice(0, 300000), service]);
    H.notify('Category added: ' + name + ' (' + service + ')');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.delete('/categories/:id', perm('categories'), async (req, res) => {
  try {
    const used = await q('SELECT COUNT(*) n FROM products WHERE cat_id=?', [Number(req.params.id)]);
    if (used[0].n) return res.status(400).json({ error: 'Move or delete its products first.' });
    await q('DELETE FROM categories WHERE id=?', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Orders ----------
r.get('/orders', perm('orders'), async (req, res) => {
  try {
    const rows = await q(`SELECT o.*, COALESCE(cu.name,o.customer_name) customer FROM orders o
      LEFT JOIN customers cu ON cu.id=o.user_id ORDER BY o.created_at DESC`);
    const items = await q('SELECT order_id, name, price, qty, emoji FROM order_items');
    const m = new Map();
    items.forEach(i => {
      if (!m.has(i.order_id)) m.set(i.order_id, []);
      m.get(i.order_id).push(i);
    });
    res.json(rows.map(o => ({
      id: o.id, ref: o.ref, user: o.customer, phone: o.phone, address: o.address,
      notes: o.notes, subtotal: Number(o.subtotal), discount: Number(o.discount),
      total: Number(o.total), payment: o.payment, status: o.status, date: o.created_at,
      pointsEarned: Number(o.points_earned) || 0, pointsUsed: Number(o.points_used) || 0,
      giftCode: o.gift_code, giftAmount: Number(o.gift_amount) || 0,
      items: m.get(o.id) || []
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put('/orders/:id', perm('orders'), async (req, res) => {
  try {
    const st = String(req.body.status || '');
    if (!VALID_STATUS.includes(st)) return res.status(400).json({ error: 'Invalid status.' });
    await q('UPDATE orders SET status=? WHERE id=?', [st, Number(req.params.id)]);
    H.notify('Order ' + req.params.id + ' → ' + st);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Customers ----------
r.get('/customers', perm('customers'), async (req, res) => {
  try {
    const rows = await q(`SELECT c.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id=c.id) orders,
      (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id=c.id) spent
      FROM customers c ORDER BY c.created_at DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.delete('/customers/:id', perm('customers'), async (req, res) => {
  try { await q('DELETE FROM customers WHERE id=?', [Number(req.params.id)]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Promos ----------
r.get('/promos', perm('promos'), async (req, res) => {
  try { res.json(await q('SELECT * FROM promos ORDER BY id')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
r.post('/promos', perm('promos'), async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const disc = Number(req.body.discount);
    if (!code || isNaN(disc) || disc < 1 || disc > 100)
      return res.status(400).json({ error: 'Enter a code and discount (1-100).' });
    const rr = await q('INSERT INTO promos (code,discount) VALUES (?,?)', [code, disc]);
    res.json({ id: rr.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
r.delete('/promos/:id', perm('promos'), async (req, res) => {
  try { await q('DELETE FROM promos WHERE id=?', [Number(req.params.id)]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Settings ----------
r.get('/settings', perm('settings'), async (req, res) => {
  try {
    const rows = await q('SELECT * FROM settings WHERE id=1');
    const s = rows[0] || {};
    let toggles = {};
    try { toggles = JSON.parse(s.toggles || '{}'); } catch (e) { toggles = {}; }
    let smtp = {};
    try { smtp = JSON.parse(s.smtp_json || '{}') || {}; } catch (e) { smtp = {}; }
    if (!req.admin.isSuper && smtp.pass) smtp.pass = '••••••••';
    res.json({
      name: s.store_name, tagline: s.tagline, email: s.email, phone: s.phone, address: s.address,
      currency: s.currency, freeDelivery: Number(s.free_delivery) || 0, deliveryFee: Number(s.delivery_fee) || 0,
      deliveryTime: s.delivery_time, deliveryZones: s.delivery_zones, toggles,
      lockMinutes: Math.max(1, Number(s.lock_minutes) || 5),
      pointsValue: Number(s.points_value) || 0,
      loyaltyThreshold: Math.max(1, Number(s.loyalty_threshold) || 100),
      maxReviewLen: Math.max(20, Math.min(2000, Number(s.max_review_len) || 300)),
      smtp, isSuper: req.admin.isSuper
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put('/settings', perm('settings'), async (req, res) => {
  try {
    const b = req.body;
    if (b.lockMinutes !== undefined && !req.admin.isSuper)
      return res.status(403).json({ error: 'Only the super admin can change the auto-lock setting.' });
    if (b.smtp !== undefined && !req.admin.isSuper)
      return res.status(403).json({ error: 'Only the super admin can change the email (SMTP) settings.' });
    const cur = await q('SELECT * FROM settings WHERE id=1');
    const s = cur[0] || {};
    let toggles = {};
    try { toggles = JSON.parse(s.toggles || '{}'); } catch (e) { toggles = {}; }
    if (b.toggles && typeof b.toggles === 'object') toggles = b.toggles;

    let smtp = {};
    try { smtp = JSON.parse(s.smtp_json || '{}') || {}; } catch (e) { smtp = {}; }
    if (b.smtp && typeof b.smtp === 'object') {
      const inS = b.smtp;
      // Keep the old password when the masked placeholder is sent back unchanged.
      const pass = inS.pass === '••••••••' ? (smtp.pass || '') : String(inS.pass || '');
      smtp = {
        host: String(inS.host || '').trim().slice(0, 200),
        port: Number(inS.port) || (inS.secure === false ? 587 : 465),
        secure: inS.secure === undefined ? true : !!inS.secure,
        user: String(inS.user || '').trim().slice(0, 200),
        pass,
        from: String(inS.from || '').trim().slice(0, 200)
      };
      if (!smtp.host) smtp = {};
    }

    await q(`UPDATE settings SET store_name=?,tagline=?,email=?,phone=?,address=?,currency=?,
      free_delivery=?,delivery_fee=?,delivery_time=?,delivery_zones=?,toggles=?,lock_minutes=?,points_value=?,
      loyalty_threshold=?,max_review_len=?,smtp_json=? WHERE id=1`,
      [
        String(b.name ?? s.store_name ?? '').slice(0, 120),
        String(b.tagline ?? s.tagline ?? '').slice(0, 200),
        String(b.email ?? s.email ?? '').slice(0, 120),
        String(b.phone ?? s.phone ?? '').slice(0, 30),
        String(b.address ?? s.address ?? '').slice(0, 255),
        String(b.currency ?? s.currency ?? 'USD').slice(0, 8),
        Number(b.freeDelivery ?? s.free_delivery ?? 0),
        Math.max(0, Number(b.deliveryFee ?? s.delivery_fee ?? 0)),
        String(b.deliveryTime ?? s.delivery_time ?? '').slice(0, 60),
        String(b.deliveryZones ?? s.delivery_zones ?? '').slice(0, 255),
        JSON.stringify(toggles),
        Math.max(1, Number(b.lockMinutes ?? s.lock_minutes ?? 5)),
        Math.max(0, Number(b.pointsValue ?? s.points_value ?? 0)),
        Math.max(1, Number(b.loyaltyThreshold ?? s.loyalty_threshold ?? 100)),
        Math.max(20, Math.min(2000, Number(b.maxReviewLen ?? s.max_review_len ?? 300))),
        JSON.stringify(smtp)
      ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Site images ----------
r.get('/images', perm('settings'), async (req, res) => {
  try { res.json(await q('SELECT * FROM banners ORDER BY bkey')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.put('/images', perm('settings'), async (req, res) => {
  try {
    const bkey = String(req.body.bkey || '').trim();
    const url = String(req.body.url || '').trim().slice(0, 60000);
    if (!bkey) return res.status(400).json({ error: 'Missing image key.' });
    const rows = await q('SELECT label FROM banners WHERE bkey=?', [bkey]);
    if (!rows.length) return res.status(404).json({ error: 'Unknown image key.' });
    await q('UPDATE banners SET url=? WHERE bkey=?', [url, bkey]);
    H.notify('Site image updated: ' + rows[0].label);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Notifications ----------
r.get('/notifications', perm('notifications'), async (req, res) => {
  try { res.json(await q('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
r.post('/notifications/:id/read', perm('notifications'), async (req, res) => {
  try { await q('UPDATE notifications SET is_read=1 WHERE id=?', [Number(req.params.id)]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
r.delete('/notifications', perm('notifications'), async (req, res) => {
  try { await q('DELETE FROM notifications'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Reports ----------
r.get('/reports', perm('reports'), async (req, res) => {
  try {
    const rev = await q('SELECT COALESCE(SUM(total),0) s, COALESCE(SUM(discount),0) d, COUNT(*) n, AVG(total) a FROM orders');
    const cust = await q('SELECT COUNT(*) n FROM customers');
    const prod = await q('SELECT COUNT(*) n FROM products');
    const pay = await q('SELECT payment, COUNT(*) n FROM orders GROUP BY payment');
    const top = await q(`SELECT name, SUM(qty) n FROM order_items GROUP BY name ORDER BY n DESC LIMIT 6`);
    const catSales = await q(`SELECT c.name, SUM(oi.qty) n FROM order_items oi
      JOIN products p ON p.id=oi.product_id JOIN categories c ON c.id=p.cat_id
      GROUP BY c.name ORDER BY n DESC`);
    res.json({
      revenue: Number(rev[0].s), discounts: Number(rev[0].d), orders: rev[0].n, avgOrder: Number(rev[0].a) || 0,
      customers: cust[0].n, products: prod[0].n,
      payments: pay, topProducts: top, categorySales: catSales
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Team management (super admin only) ----------
r.get('/admins', superOnly, async (req, res) => {
  try {
    const rows = await q('SELECT id,name,email,role,permissions,status,last_login,created_at FROM admins ORDER BY id');
    res.json(rows.map(a => {
      let perms = [];
      try { perms = JSON.parse(a.permissions || '[]'); } catch (e) { perms = []; }
      return { id: a.id, name: a.name, email: a.email, role: a.role, perms, status: a.status, last_login: a.last_login, created_at: a.created_at };
    }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function cleanAdminBody(b) {
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const role = b.role === 'superadmin' ? 'superadmin' : 'staff';
  let perms = [];
  if (role === 'staff') {
    if (!Array.isArray(b.perms)) return null;
    perms = b.perms.filter(p => ALL_PERMS.includes(p));
  }
  if (!name || !email.includes('@')) return null;
  return { name, email, role, perms };
}

r.post('/admins', superOnly, async (req, res) => {
  try {
    const b = cleanAdminBody(req.body);
    const password = String(req.body.password || '');
    if (!b) return res.status(400).json({ error: 'Enter a name and a valid email.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    const exists = await q('SELECT id FROM admins WHERE email=?', [b.email]);
    if (exists.length) return res.status(409).json({ error: 'That email is already an admin.' });
    const rr = await q('INSERT INTO admins (name,email,pass_hash,role,permissions) VALUES (?,?,?,?,?)',
      [b.name, b.email, H.hashPassword(password), b.role, JSON.stringify(b.perms)]);
    H.notify('New admin added: ' + b.name + ' (' + b.role + ')');
    res.json({ id: rr.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put('/admins/:id', superOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const b = cleanAdminBody(req.body);
    if (!b) return res.status(400).json({ error: 'Enter a name and a valid email.' });
    if (id === req.admin.id) {
      const row = await q('SELECT role FROM admins WHERE id=?', [id]);
      if (row.length && row[0].role !== b.role && b.role !== 'superadmin')
        return res.status(400).json({ error: 'You cannot remove your own super admin role.' });
      if (row.length && row[0].role === 'superadmin' && b.role !== 'superadmin')
        return res.status(400).json({ error: 'You cannot demote yourself.' });
    }
    const target = await q('SELECT role FROM admins WHERE id=?', [id]);
    if (!target.length) return res.status(404).json({ error: 'Admin not found.' });
    if (target[0].role === 'superadmin' && b.role !== 'superadmin') {
      const supers = await q('SELECT COUNT(*) n FROM admins WHERE role=? AND status=1', ['superadmin']);
      if (supers[0].n <= 1) return res.status(400).json({ error: 'At least one active super admin is required.' });
    }
    const upd = [];
    const vals = [];
    upd.push('name=?'); vals.push(b.name);
    upd.push('email=?'); vals.push(b.email);
    upd.push('role=?'); vals.push(b.role);
    upd.push('permissions=?'); vals.push(JSON.stringify(b.perms));
    if (req.body.status !== undefined) {
      const wantStatus = req.body.status ? 1 : 0;
      if (id === req.admin.id && !wantStatus)
        return res.status(400).json({ error: 'You cannot disable your own account.' });
      if (target[0].role === 'superadmin' && b.role === 'superadmin' && !wantStatus) {
        const supers = await q('SELECT COUNT(*) n FROM admins WHERE role=? AND status=1', ['superadmin']);
        if (supers[0].n <= 1) return res.status(400).json({ error: 'At least one active super admin is required.' });
      }
      upd.push('status=?'); vals.push(wantStatus);
    }
    if (String(req.body.password || '').length) {
      if (String(req.body.password).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      upd.push('pass_hash=?'); vals.push(H.hashPassword(String(req.body.password)));
    }
    vals.push(id);
    await q('UPDATE admins SET ' + upd.join(',') + ' WHERE id=?', vals);
    H.notify('Admin updated: ' + b.name);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.delete('/admins/:id', superOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.admin.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
    const target = await q('SELECT role FROM admins WHERE id=?', [id]);
    if (!target.length) return res.status(404).json({ error: 'Admin not found.' });
    if (target[0].role === 'superadmin') {
      const supers = await q('SELECT COUNT(*) n FROM admins WHERE role=?', ['superadmin']);
      if (supers[0].n <= 1) return res.status(400).json({ error: 'At least one super admin is required.' });
    }
    await q('DELETE FROM admins WHERE id=?', [id]);
    await q('DELETE FROM sessions WHERE user_type=? AND user_id=?', ['admin', id]);
    H.notify('Admin removed (id ' + id + ')');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Reviews ----------
r.get('/reviews', perm('reviews'), async (req, res) => {
  try {
    const rows = await q(`SELECT r.*, p.name product FROM reviews r JOIN products p ON p.id=r.product_id ORDER BY r.created_at DESC LIMIT 300`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
r.patch('/reviews/:id', perm('reviews'), async (req, res) => {
  try {
    const st = req.body.status ? 1 : 0;
    await q('UPDATE reviews SET status=? WHERE id=?', [st, Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
r.delete('/reviews/:id', perm('reviews'), async (req, res) => {
  try { await q('DELETE FROM reviews WHERE id=?', [Number(req.params.id)]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Reservations ----------
r.get('/reservations', perm('reservations'), async (req, res) => {
  try { res.json(await q('SELECT * FROM reservations ORDER BY res_date DESC, res_time DESC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
r.put('/reservations/:id', perm('reservations'), async (req, res) => {
  try {
    const st = String(req.body.status || '');
    if (!['Pending', 'Confirmed', 'Done', 'Cancelled'].includes(st))
      return res.status(400).json({ error: 'Invalid status.' });
    await q('UPDATE reservations SET status=? WHERE id=?', [st, Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
r.delete('/reservations/:id', perm('reservations'), async (req, res) => {
  try { await q('DELETE FROM reservations WHERE id=?', [Number(req.params.id)]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Gift cards ----------
r.get('/giftcards', perm('giftcards'), async (req, res) => {
  try { res.json(await q('SELECT * FROM giftcards ORDER BY created_at DESC LIMIT 300')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
r.post('/giftcards', perm('giftcards'), async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const buyer = String(req.body.buyerName || '').trim().slice(0, 80);
    const email = String(req.body.buyerEmail || '').trim().toLowerCase().slice(0, 120);
    if (isNaN(amount) || amount < 1 || amount > 500)
      return res.status(400).json({ error: 'Value must be between 1 and 500.' });
    if (!buyer || !email.includes('@')) return res.status(400).json({ error: 'Enter a name and email.' });
    let code = 'MOOD-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const rr = await q('INSERT INTO giftcards (code,amount,balance,buyer_name,buyer_email) VALUES (?,?,?,?,?)',
      [code, amount, amount, buyer, email]);
    res.json({ id: rr.insertId, code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
r.patch('/giftcards/:id', perm('giftcards'), async (req, res) => {
  try {
    await q('UPDATE giftcards SET status=? WHERE id=?', [req.body.status ? 1 : 0, Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
r.delete('/giftcards/:id', perm('giftcards'), async (req, res) => {
  try { await q('DELETE FROM giftcards WHERE id=?', [Number(req.params.id)]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- CSV export ----------
r.get('/export/:type', perm('reports'), async (req, res) => {
  try {
    const t = req.params.type;
    let csv = '';
    if (t === 'orders') {
      const rows = await q('SELECT ref,customer_name,phone,address,total,payment,status,created_at FROM orders ORDER BY created_at DESC');
      csv = 'ref,customer,phone,address,total,payment,status,date\n' + rows.map(o =>
        [o.ref, o.customer_name, o.phone, '"' + (o.address || '') + '"', o.total, o.payment, o.status, o.created_at].join(',')).join('\n');
    } else if (t === 'customers') {
      const rows = await q('SELECT name,email,created_at FROM customers ORDER BY created_at DESC');
      csv = 'name,email,joined\n' + rows.map(u => [u.name, u.email, u.created_at].join(',')).join('\n');
    } else if (t === 'products') {
      const rows = await q('SELECT name,price,available FROM products ORDER BY id');
      csv = 'name,price,available\n' + rows.map(p => [p.name, p.price, p.available ? 'yes' : 'no'].join(',')).join('\n');
    } else return res.status(404).json({ error: 'Unknown export.' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=' + t + '.csv');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = r;
