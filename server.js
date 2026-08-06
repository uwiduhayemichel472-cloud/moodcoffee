// ─── MOOD Coffee Shop & Bakery ─ server entry ───────
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cfg = require('./config.js');
const { q, pool } = require('./db.js');
const H = require('./helpers.js');
const mailer = require('./mailer.js');
const pay = require('./payment.js');

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(H.csrf); // block cross-origin writes

// ─── Maintenance mode: when ON, the whole customer site shows the
// maintenance page (admin panel + API stay fully working) ───────────
let maintCache = { v: null, t: 0 };
async function maintMode() {
  if (maintCache.v !== null && Date.now() - maintCache.t < 4000) return maintCache.v;
  try {
    const rows = await q('SELECT toggles FROM settings WHERE id=1');
    let t = {};
    try { t = JSON.parse(rows[0] && rows[0].toggles || '{}'); } catch (e) { t = {}; }
    maintCache = { v: !!t.maint, t: Date.now() };
  } catch (e) { maintCache = { v: false, t: Date.now() }; }
  return maintCache.v;
}
app.use(async (req, res, next) => {
  const p = req.path;
  if (req.method === 'GET' && p !== '/maintenance.html' && !p.startsWith('/api') && !p.startsWith('/admin')) {
    if (await maintMode()) return res.sendFile(path.join(__dirname, 'public', 'maintenance.html'));
  }
  next();
});

// ─── Static: customer site + separate admin area ────
app.use(express.static(path.join(__dirname, 'public')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'public', 'shop.html')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ═══════════════════════ PUBLIC API ═══════════════════════
const setCur = s => s.currency || 'USD';
const money = v => Number(v || 0).toFixed(2);

async function loadSettings() {
  const rows = await q('SELECT * FROM settings WHERE id=1');
  const s = rows[0] || {};
  let toggles = {};
  try { toggles = JSON.parse(s.toggles || '{}'); } catch (e) { toggles = {}; }
  for (const k in { loyalty: true }) if (toggles[k] === undefined) toggles[k] = true;
  let smtp = {};
  try { smtp = JSON.parse(s.smtp_json || '{}') || {}; } catch (e) { smtp = {}; }
  return {
    name: s.store_name, tagline: s.tagline, email: s.email, phone: s.phone,
    address: s.address, currency: s.currency, freeDelivery: Number(s.free_delivery) || 0,
    deliveryFee: Number(s.delivery_fee) || 0, deliveryTime: s.delivery_time,
    deliveryZones: s.delivery_zones, toggles, pointsValue: Number(s.points_value) || 0,
    maxReviewLen: Math.max(20, Math.min(2000, Number(s.max_review_len) || 300)),
    smtp
  };
}

function productShape(p) {
  return {
    id: p.id, cat: p.cat, catId: p.cat_id, name: p.name, desc: p.description,
    price: Number(p.price), emoji: p.emoji, img: p.image, avail: p.available, feat: p.featured,
    rating: Number(p.ravg) || 0, reviews: Number(p.rc) || 0
  };
}

async function publicProducts() {
  const rows = await q(`SELECT p.*, c.name AS cat,
    IFNULL(r.rc,0) rc, IFNULL(r.ravg,0) ravg
    FROM products p JOIN categories c ON c.id=p.cat_id
    LEFT JOIN (SELECT product_id, COUNT(*) rc, ROUND(AVG(rating),1) ravg
      FROM reviews WHERE status=1 GROUP BY product_id) r ON r.product_id=p.id
    WHERE p.available=1 ORDER BY c.sort, p.id`);
  return rows.map(productShape);
}

app.get('/api/init', async (req, res) => {
  try {
    const [settings, cats, products, banns] = await Promise.all([
      loadSettings(),
      q('SELECT * FROM categories ORDER BY sort, id'),
      publicProducts(),
      q('SELECT bkey,url FROM banners')
    ]);
    const images = {};
    banns.forEach(b => { images[b.bkey] = b.url; });
    let me = null;
    const s = await H.getSession(req, 'customer');
    if (s) { const u = await q('SELECT id,name,email,phone,points,created_at FROM customers WHERE id=?', [s.id]); if (u.length) me = u[0]; }
    res.json({
      settings,
      categories: cats.map(c => ({ id: c.id, name: c.name, img: c.image, service: c.service || 'coffee' })),
      products,
      images,
      me
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/settings', async (req, res) => {
  try { res.json(await loadSettings()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/register', async (req, res) => {
  try {
    const st = await loadSettings();
    if (st.toggles.reg === false)
      return res.status(503).json({ error: 'New registrations are currently disabled.' });
    const { name = '', email = '', password = '', phone = '' } = req.body;
    if (!name.trim() || !email.includes('@') || password.length < 6)
      return res.status(400).json({ error: 'Enter your name, a valid email and a 6+ character password.' });
    if (!H.rateLimit(req.ip, 'reg', 10, 60000))
      return res.status(429).json({ error: 'Too many attempts. Try later.' });
    const exists = await q('SELECT id FROM customers WHERE email=?', [email.toLowerCase()]);
    if (exists.length) return res.status(409).json({ error: 'That email is already registered.' });
    const r = await q('INSERT INTO customers (name,email,pass_hash,phone) VALUES (?,?,?,?)',
      [name.trim(), email.toLowerCase(), H.hashPassword(password), String(phone).trim()]);
    await H.issueSession(res, 'customer', r.insertId, req);
    H.notify('New customer: ' + name.trim());
    res.json({ user: { id: r.insertId, name: name.trim(), email: email.toLowerCase(), phone: String(phone).trim(), points: 0, created_at: new Date().toISOString().slice(0, 19).replace('T', ' ') } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email = '', password = '' } = req.body;
    if (!H.rateLimit(req.ip, 'login', 10, 60000))
      return res.status(429).json({ error: 'Too many attempts. Try later.' });
    const rows = await q('SELECT * FROM customers WHERE email=?', [email.toLowerCase()]);
    if (!rows.length || !H.verifyPassword(password, rows[0].pass_hash))
      return res.status(401).json({ error: 'Incorrect email or password.' });
    await H.issueSession(res, 'customer', rows[0].id, req);
    const u = rows[0];
    res.json({ user: { id: u.id, name: u.name, email: u.email, phone: u.phone, points: Number(u.points) || 0, created_at: u.created_at } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logout', async (req, res) => {
  await H.logout(res, req, 'customer');
  res.json({ ok: true });
});

app.get('/api/me', H.requireCustomer, (req, res) => res.json({ user: req.user }));

app.post('/api/newsletter', async (req, res) => {
  try {
    const { name = '', email = '', prefs = '' } = req.body;
    if (!email.includes('@')) return res.status(400).json({ error: 'Enter a valid email.' });
    await q('INSERT INTO newsletter (email,name,prefs) VALUES (?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), prefs=VALUES(prefs)',
      [email.toLowerCase(), name.trim(), String(prefs).slice(0, 255)]);

    // ── Send the signup straight to the coffee shop's inbox ──
    const st = await loadSettings();
    const shopEmail = String(st.email || '').trim();
    let mailOk = false;
    if (shopEmail) {
      mailOk = await mailer.sendMail(st.smtp, {
        to: shopEmail,
        subject: '🔔 New newsletter signup — ' + (name.trim() || email.toLowerCase()),
        text: 'A new person just joined the "Stay in the Loop" list:\n\n' +
          'Name:  ' + (name.trim() || '—') + '\n' +
          'Email: ' + email.toLowerCase() + '\n' +
          'Favourite/preferences: ' + (String(prefs || '').trim() || '—') + '\n\n' +
          'Reach out and say hello — they want to hear from MOOD!',
        html: '<div style="font-family:Arial,sans-serif;color:#2a1206;max-width:560px">' +
          '<h2 style="margin:0 0 6px">☕ New newsletter signup</h2>' +
          '<p style="margin:0 0 18px;color:#7a5c44">A new person just joined the "Stay in the Loop" list:</p>' +
          '<table cellpadding="8" style="border-collapse:collapse;width:100%">' +
          '<tr><td style="border:1px solid #e8ddd3;background:#faf7f4"><b>Name</b></td><td style="border:1px solid #e8ddd3">' + (name.trim() || '—') + '</td></tr>' +
          '<tr><td style="border:1px solid #e8ddd3;background:#faf7f4"><b>Email</b></td><td style="border:1px solid #e8ddd3">' + email.toLowerCase() + '</td></tr>' +
          '<tr><td style="border:1px solid #e8ddd3;background:#faf7f4"><b>Preferences</b></td><td style="border:1px solid #e8ddd3">' + (String(prefs || '').trim() || '—') + '</td></tr>' +
          '</table><p style="color:#7a5c44;font-size:13px">Reach out and say hello — they want to hear from MOOD!</p></div>'
      });
    }
    res.json({ ok: true, mailOk, shopEmail: mailOk ? shopEmail : '' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/promo', async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const rows = await q('SELECT * FROM promos WHERE code=?', [code]);
    if (!rows.length) return res.status(404).json({ error: 'Invalid promo code.' });
    res.json({ code: rows[0].code, discount: rows[0].discount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/my-orders', H.requireCustomer, async (req, res) => {
  try {
    const rows = await q(`SELECT o.*, oi.name item_name, oi.price item_price, oi.qty item_qty, oi.emoji item_emoji
      FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE o.user_id=? ORDER BY o.created_at DESC`, [req.user.id]);
    const map = new Map();
    rows.forEach(r => {
      if (!map.has(r.id)) map.set(r.id, {
        id: r.ref, status: r.status, payment: r.payment, total: Number(r.total),
        discount: Number(r.discount), date: r.created_at,
        pointsEarned: Number(r.points_earned) || 0, pointsUsed: Number(r.points_used) || 0,
        giftCode: r.gift_code, giftAmount: Number(r.gift_amount) || 0,
        items: []
      });
      map.get(r.id).items.push({ name: r.item_name, price: Number(r.item_price), qty: r.item_qty, emoji: r.item_emoji });
    });
    res.json({ orders: [...map.values()] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders', H.requireCustomer, async (req, res) => {
  try {
    const st = await loadSettings();
    if (st.toggles.maint || st.toggles.ord === false)
      return res.status(503).json({ error: 'We are not accepting orders right now. Please check back later.' });
    const { cart = [], phone = '', address = '', notes = '', payment = 'paypal', promo = '', points = 0, gift = '' } = req.body;
    if (!Array.isArray(cart) || !cart.length || !phone.trim() || !address.trim())
      return res.status(400).json({ error: 'Your cart is empty or delivery details are missing.' });

    // Re-validate prices from the DB — never trust client prices
    const ids = cart.map(i => Number(i.id));
    if (ids.some(isNaN)) return res.status(400).json({ error: 'Invalid cart.' });
    const placeholders = ids.map(() => '?').join(',');
    const dbRows = await q(`SELECT p.id,p.name,p.price,p.emoji FROM products p
      WHERE p.id IN (${placeholders}) AND p.available=1`, ids);
    const dbMap = new Map(dbRows.map(p => [p.id, p]));

    let subtotal = 0;
    const items = [];
    for (const c of cart) {
      const p = dbMap.get(Number(c.id));
      const n = Number(c.qty);
      if (!p || !n || n < 1 || n > 99) return res.status(400).json({ error: 'Invalid product or quantity.' });
      items.push({ id: p.id, name: p.name, price: Number(p.price), qty: n, emoji: p.emoji });
      subtotal += Number(p.price) * n;
    }

    let discount = 0;
    if (promo) {
      const pr = await q('SELECT * FROM promos WHERE code=?', [String(promo).trim().toUpperCase()]);
      if (pr.length) discount = subtotal * (pr[0].discount / 100);
    }
    subtotal = Math.round(subtotal * 100) / 100;
    discount = Math.round(discount * 100) / 100;
    let total = Math.round((subtotal - discount) * 100) / 100;

    // ── Gift card ──
    let giftCode = String(gift || '').trim().toUpperCase(), giftAmount = 0, giftRow = null;
    if (giftCode) {
      const g = await q('SELECT * FROM giftcards WHERE code=? AND status=1', [giftCode]);
      if (!g.length) return res.status(404).json({ error: 'That gift card code is not valid.' });
      giftRow = g[0];
      giftAmount = Math.round(Math.min(Number(g[0].balance), total) * 100) / 100;
      total = Math.round((total - giftAmount) * 100) / 100;
    }

    // ── Loyalty points ──
    const pv = Number(st.pointsValue) || 0;
    const loyaltyOn = st.toggles.loyalty !== false;
    let pointsUsed = 0, pointsEarned = 0;
    if (loyaltyOn && pv > 0 && total > 0 && Number(points) > 0) {
      const me = await q('SELECT points FROM customers WHERE id=?', [req.user.id]);
      const balance = Number((me[0] && me[0].points) || 0);
      pointsUsed = Math.min(Math.floor(Number(points)), balance, Math.floor(total / pv));
      total = Math.round((total - pointsUsed * pv) * 100) / 100;
    }
    if (loyaltyOn) pointsEarned = Math.floor(subtotal);

    const ref = 'MD-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900);
    const useGateway = pay.configured();
    const currency = st.currency || 'USD';
    const isRWF = currency === 'RWF';
    const payAmount = isRWF ? Math.max(100, Math.round(total)) : Math.round(total * 100) / 100;

    // ── Real payments (Flutterwave) ──
    // Create the hosted payment page first, then hold the order as
    // 'Pending' until Flutterwave confirms the money arrived. Gift card
    // / loyalty points are only applied at that confirmation moment.
    if (useGateway) {
      let link;
      try {
        link = await pay.createPaymentLink({
          amount: payAmount, currency,
          tx_ref: ref,
          customer: { email: req.user.email, name: req.user.name, phone: phone.trim(), method: payment },
          description: items.map(i => i.name + ' ×' + i.qty).join(', ').slice(0, 180)
        });
      } catch (e) {
        return res.status(502).json({ error: 'Could not start the payment. Please try again in a moment.' });
      }
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [o] = await conn.execute(
          `INSERT INTO orders (ref,user_id,customer_name,phone,address,notes,subtotal,discount,total,payment,status,
            points_earned,points_used,gift_code,gift_amount)
           VALUES (?,?,?,?,?,?,?,?,?,?,'Pending',?,?,?,?)`,
          [ref, req.user.id, req.user.name, phone.trim(), address.trim(), notes || '', subtotal, discount, total, payment,
            pointsEarned, pointsUsed, giftCode || null, giftAmount]);
        for (const it of items)
          await conn.execute('INSERT INTO order_items (order_id,product_id,name,price,qty,emoji) VALUES (?,?,?,?,?,?)',
            [o.insertId, it.id, it.name, it.price, it.qty, it.emoji]);
        await conn.commit();
        conn.release();
      } catch (e) { conn.rollback(); conn.release(); throw e; }
      return res.json({ need_payment: true, payment_link: link, ref, total, currency });
    }

    // ── Demo / manual mode (no gateway keys yet): accept directly ──
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [o] = await conn.execute(
        `INSERT INTO orders (ref,user_id,customer_name,phone,address,notes,subtotal,discount,total,payment,status,
          points_earned,points_used,gift_code,gift_amount)
         VALUES (?,?,?,?,?,?,?,?,?,?,'Preparing',?,?,?,?)`,
        [ref, req.user.id, req.user.name, phone.trim(), address.trim(), notes || '', subtotal, discount, total, payment,
          pointsEarned, pointsUsed, giftCode || null, giftAmount]);
      for (const it of items)
        await conn.execute('INSERT INTO order_items (order_id,product_id,name,price,qty,emoji) VALUES (?,?,?,?,?,?)',
          [o.insertId, it.id, it.name, it.price, it.qty, it.emoji]);
      if (pointsUsed || pointsEarned)
        await conn.execute('UPDATE customers SET points = points - ? + ? WHERE id=?', [pointsUsed, pointsEarned, req.user.id]);
      if (giftRow) {
        const remain = Math.round((Number(giftRow.balance) - giftAmount) * 100) / 100;
        await conn.execute('UPDATE giftcards SET balance=?, status=? WHERE id=?', [remain, remain > 0 ? 1 : 0, giftRow.id]);
      }
      await conn.commit();
      conn.release();
    } catch (e) { conn.rollback(); conn.release(); throw e; }

    H.notify(`New order ${ref} from ${req.user.name} — ${money(total)}`);
    res.json({ ref, total, status: 'Preparing', pointsEarned, giftUsed: giftAmount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Payment confirmation (Flutterwave) ───────────────
// Marks a 'Pending' order as paid only after the transaction is verified
// server-side with Flutterwave. Safe to call more than once.
async function confirmPaidOrder(ref, txId) {
  const rows = await q('SELECT * FROM orders WHERE ref=?', [ref]);
  if (!rows.length) return false;
  const o = rows[0];
  if (o.status !== 'Pending') return o.status === 'Preparing';
  let tx;
  try { tx = await pay.verifyTransaction(txId); } catch (e) { return false; }
  if (!tx || tx.status !== 'successful') return false;
  const st = await loadSettings();
  const currency = st.currency || 'USD';
  if (String(tx.currency).toUpperCase() !== String(currency).toUpperCase()) return false;
  if (Math.round(Number(tx.amount) * 100) < Math.round(Number(o.total) * 100)) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("UPDATE orders SET status='Preparing', tx_id=? WHERE id=?", [String(tx.id || txId), o.id]);
    const pUsed = Number(o.points_used) || 0, pEarn = Number(o.points_earned) || 0;
    if (pUsed || pEarn)
      await conn.execute('UPDATE customers SET points = points - ? + ? WHERE id=?', [pUsed, pEarn, o.user_id]);
    if (o.gift_code) {
      const g = await conn.execute('SELECT id,balance FROM giftcards WHERE code=?', [o.gift_code]);
      if (g[0][0]) {
        const remain = Math.round((Number(g[0][0].balance) - Number(o.gift_amount)) * 100) / 100;
        await conn.execute('UPDATE giftcards SET balance=?, status=? WHERE id=?', [remain, remain > 0 ? 1 : 0, g[0][0].id]);
      }
    }
    await conn.commit();
  } catch (e) { try { conn.rollback(); } catch (_) {} }
  finally { conn.release(); }
  H.notify('Payment received: order ' + ref + ' — ' + currency + ' ' + Number(o.total).toFixed(2));
  try {
    if (st.smtp && st.smtp.user) {
      const cust = await q('SELECT email,name FROM customers WHERE id=?', [o.user_id]);
      if (cust[0] && cust[0].email)
        mailer.sendMail(st.smtp, {
          to: cust[0].email,
          subject: 'Order ' + ref + ' confirmed — MOOD Coffee Shop & Bakery',
          text: 'Hi ' + (cust[0].name || '') + ',\n\n' +
            'Your payment was received and your order ' + ref + ' is now being prepared.\n' +
            'Total paid: ' + currency + ' ' + Number(o.total).toFixed(2) + '\n\n' +
            'Thank you for choosing MOOD Coffee & Bakery! ☕'
        });
    }
  } catch (e) { /* email is optional */ }
  return true;
}

app.get('/api/pay/verify', async (req, res) => {
  const ref = String(req.query.ref || '');
  const txId = String(req.query.transaction_id || req.query.tx_ref || '');
  const ok = (ref && txId) ? await confirmPaidOrder(ref, txId) : false;
  res.redirect('/shop' + (ok ? '?paid=' + encodeURIComponent(ref) : '?payfail=1'));
});

// Flutterwave webhook: confirms the order even if the customer closes the
// browser after paying. Protected by the verif-hash header when configured.
app.post('/api/pay/webhook', async (req, res) => {
  try {
    const hdr = String(req.headers['verif-hash'] || '');
    if (cfg.gateway.flutterwave.webhookSecret && hdr !== cfg.gateway.flutterwave.webhookSecret)
      return res.status(401).json({ error: 'Invalid webhook hash.' });
    const d = (req.body && req.body.data) || {};
    if (d.status === 'successful' && d.tx_ref)
      await confirmPaidOrder(String(d.tx_ref), String(d.id || ''));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Reviews (ratings) ───
app.get('/api/reviews', async (req, res) => {
  try {
    const pid = Number(req.query.productId);
    if (!pid) return res.status(400).json({ error: 'Missing product.' });
    const rows = await q('SELECT id, customer_name, rating, comment, created_at FROM reviews WHERE product_id=? AND status=1 ORDER BY created_at DESC LIMIT 20', [pid]);
    res.json({ reviews: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reviews', H.requireCustomer, async (req, res) => {
  try {
    const st = await loadSettings();
    const maxLen = st.maxReviewLen;
    const pid = Number(req.body.productId);
    const rating = Math.round(Number(req.body.rating));
    const comment = String(req.body.comment || '');
    if (!pid || rating < 1 || rating > 5)
      return res.status(400).json({ error: 'Pick a rating from 1 to 5 stars.' });
    if (comment.length > maxLen)
      return res.status(400).json({ error: 'Your comment is too long — maximum ' + maxLen + ' characters.' });
    const prod = await q('SELECT id FROM products WHERE id=?', [pid]);
    if (!prod.length) return res.status(404).json({ error: 'Product not found.' });
    // Only customers who actually ordered the item can review it (stops spam).
    const ordered = await q(`SELECT COUNT(*) n FROM orders o JOIN order_items oi ON oi.order_id=o.id
      WHERE o.user_id=? AND oi.product_id=?`, [req.user.id, pid]);
    if (!ordered[0].n) return res.status(403).json({ error: 'You can only review an item you have ordered.' });
    await q('INSERT INTO reviews (product_id,user_id,customer_name,rating,comment) VALUES (?,?,?,?,?)',
      [pid, req.user.id, req.user.name, rating, comment.slice(0, maxLen)]);
    H.notify('New review: ' + rating + '★ on product #' + pid + ' by ' + req.user.name);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Table reservations (accounts only — login/sign up required) ───
function bookingTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function validBookingDate(s) {
  if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(s)) return false;
  const y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)), d = Number(s.slice(8, 10));
  if (m < 1 || m > 12) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
app.post('/api/reservations', H.requireCustomer, async (req, res) => {
  try {
    const { name = '', phone = '', guests = 1, date = '', time = '', notes = '' } = req.body;
    const dateStr = String(date).slice(0, 10);
    const timeStr = String(time).slice(0, 5);

    if (!validBookingDate(dateStr))
      return res.status(400).json({ error: 'Pick a valid booking date.' });
    if (dateStr < bookingTodayStr())
      return res.status(400).json({ error: 'Please choose today or a future date.' });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr))
      return res.status(400).json({ error: 'Pick a valid booking time.' });
    if (dateStr === bookingTodayStr()) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const t = timeStr.split(':').map(Number);
      if (t[0] * 60 + t[1] <= nowMin)
        return res.status(400).json({ error: 'Please pick a time later than now.' });
    }
    if (Number(guests) < 1 || Number(guests) > 50)
      return res.status(400).json({ error: 'Guests must be between 1 and 50.' });
    if (!H.rateLimit(req.ip, 'resv', 5, 60000))
      return res.status(429).json({ error: 'Too many reservations. Try again later.' });

    const fullName = (name.trim() || req.user.name).slice(0, 80);
    const fullPhone = (phone.trim() || req.user.phone || '').slice(0, 30);
    if (!fullName || !fullPhone)
      return res.status(400).json({ error: 'Enter your name and phone.' });

    const r = await q('INSERT INTO reservations (user_id,name,phone,guests,res_date,res_time,notes) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, fullName, fullPhone, Number(guests), dateStr, timeStr, notes.slice(0, 500)]);
    H.notify('New table booking: ' + fullName + ' for ' + guests + ' on ' + dateStr + ' ' + timeStr);
    res.json({ id: r.insertId, status: 'Pending', ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/my-reservations', H.requireCustomer, async (req, res) => {
  try {
    res.json({ reservations: await q('SELECT * FROM reservations WHERE user_id=? ORDER BY res_date DESC, res_time DESC LIMIT 20', [req.user.id]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Gift cards ───
function gcCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 12; i++) c += chars[crypto.randomInt(0, chars.length)];
  return 'MOOD-' + c.match(/.{1,4}/g).join('-');
}
app.post('/api/giftcards', H.requireCustomer, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const buyerEmail = String(req.body.buyerEmail || req.user.email).slice(0, 120);
    const message = String(req.body.message || '').slice(0, 500);
    if (isNaN(amount) || amount < 1 || amount > 500)
      return res.status(400).json({ error: 'Gift card value must be between 1 and 500.' });
    if (!H.rateLimit(req.ip, 'gc', 5, 60000))
      return res.status(429).json({ error: 'Too many gift cards. Try again later.' });
    let code = gcCode();
    let tries = 0;
    while ((await q('SELECT id FROM giftcards WHERE code=?', [code])).length && tries++ < 5) code = gcCode();
    await q('INSERT INTO giftcards (code,amount,balance,buyer_name,buyer_email,message) VALUES (?,?,?,?,?,?)',
      [code, amount, amount, req.user.name, buyerEmail, message]);
    H.notify('Gift card purchased: ' + buyerEmail + ' — $' + amount);
    res.json({ code, amount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/my-giftcards', H.requireCustomer, async (req, res) => {
  try {
    res.json({ giftcards: await q('SELECT code,amount,balance,status,created_at FROM giftcards WHERE buyer_email=? ORDER BY created_at DESC LIMIT 20', [req.user.email]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/giftcard', async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const g = await q('SELECT code,balance FROM giftcards WHERE code=? AND status=1', [code]);
    if (!g.length) return res.status(404).json({ error: 'That gift card code is not valid.' });
    res.json({ code: g[0].code, balance: Number(g[0].balance) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════ ADMIN API (separate area) ═══════════════════════
app.use('/api/admin', require('./admin-api.js'));

// ─── Boot ────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

async function boot() {
  try {
    await q('SELECT 1');
  } catch (e) {
    console.error('Database not ready. Run: npm run db:init   (then start XAMPP MySQL)');
    process.exit(1);
  }
  setInterval(H.purgeExpired, 60 * 60 * 1000);
  app.listen(cfg.port, () => {
    console.log('MOOD Coffee Shop & Bakery running:');
    console.log('  Customer site  ->  http://localhost:' + cfg.port + '/');
    console.log('  Shop / Menu    ->  http://localhost:' + cfg.port + '/shop');
    console.log('  Admin panel    ->  http://localhost:' + cfg.port + '/admin  (separate & private)');
  });
}
boot();
