// ─── AI assistant — MOOD Coffee Shop ─────────────────
// A built-in intent assistant that understands natural-language questions and
// answers them straight from the database. No external AI keys required.
//
//  - POST /api/ai/chat        -> customer assistant (public site data only +
//                                 the logged-in customer's own data)
//  - POST /api/admin/ai/chat  -> admin assistant (full business data: latest
//                                 customer, today's earnings, new orders…)
//
// Every question is logged to ai_chats so the shop can see what people ask and
// improve over time. Insights are computed live from past orders, so the
// assistant "learns" from the shop's real history.
const { q } = require('./db.js');

// ── small helpers ──────────────────────────────────
const n = v => Number(v || 0);
function money(v) {
  return (CUR === 'RWF' ? 'RWF ' : '$') + (CUR === 'RWF' ? Math.round(n(v)).toString() : n(v).toFixed(2));
}
let CUR = 'USD';
async function loadCur() {
  try {
    const rows = await q('SELECT currency FROM settings WHERE id=1');
    if (rows.length && rows[0].currency) CUR = rows[0].currency;
  } catch (e) { /* default */ }
}
const esc = s => String(s ?? '').slice(0, 400);

// intent scorer: each pattern is [keywords-array, weight]; matched keywords add weight.
function score(text, patterns) {
  const t = ' ' + text.toLowerCase() + ' ';
  let s = 0;
  for (const [words, w] of patterns) {
    if (words.some(kw => t.includes(kw))) s += w;
  }
  return s;
}
const pick = (a, b) => (a.length && a[0].n ? a[0].n : b);

function when(d) {
  if (!d) return '';
  return String(d).slice(0, 16).replace('T', ' ');
}
function fmtList(items, f) { return items.map(f).join(' • ') || '—'; }

// ── ADMIN ASSISTANT ─────────────────────────────────
const ADMIN_INTENTS = [
  {
    id: 'latest_customer',
    keys: [['latest customer', 'newest customer', 'new customer', 'last customer', 'most recent customer', 'who just joined', 'recent signup', 'recent customer'], 10],
    async answer() {
      const u = await q('SELECT * FROM customers ORDER BY created_at DESC LIMIT 1');
      if (!u.length) return 'There are no customers yet. When the first person signs up I will show their details here.';
      const c = u[0];
      const spent = await q('SELECT COUNT(*) orders, COALESCE(SUM(total),0) spent FROM orders WHERE user_id=?', [c.id]);
      const last = await q('SELECT ref,total,status,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 1', [c.id]);
      return [
        '📇 Latest customer',
        '',
        '👤 ' + c.name,
        '📧 ' + c.email,
        '📱 ' + (c.phone || '—'),
        '⭐ ' + n(c.points) + ' loyalty points',
        '🛒 ' + n(spent[0].orders) + ' order(s), total ' + money(n(spent[0].spent)),
        '📅 Joined ' + when(c.created_at),
        last[0] ? '🧾 Last order ' + last[0].ref + ' · ' + money(n(last[0].total)) + ' · ' + last[0].status + ' · ' + when(last[0].created_at) : 'No orders yet.'
      ].join('\n');
    }
  },
  {
    id: 'todays_earnings',
    keys: [['earned today', 'today earn', 'today\'s earning', 'earning today', 'revenue today', 'sales today', 'money today', 'how much today', 'we earn today', 'income today', 'revenue for today', 'earnings today'], 12],
    async answer() {
      const rows = await q("SELECT COALESCE(SUM(total),0) s, COUNT(*) n FROM orders WHERE DATE(created_at)=CURDATE() AND status <> 'Cancelled'");
      const byPay = await q("SELECT payment, COALESCE(SUM(total),0) s FROM orders WHERE DATE(created_at)=CURDATE() AND status <> 'Cancelled' GROUP BY payment");
      const d = await q("SELECT COALESCE(SUM(total),0) s FROM orders WHERE DATE(created_at)=DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND status <> 'Cancelled'");
      const [w] = await Promise.all([q("SELECT COALESCE(SUM(total),0) s, COUNT(*) n FROM orders WHERE YEARWEEK(created_at,1)=YEARWEEK(CURDATE(),1) AND status <> 'Cancelled'")]);
      return [
        '💰 Today\'s earnings',
        '',
        money(n(rows[0].s)) + ' from ' + rows[0].n + ' order(s) today' +
          (n(d[0].s) ? ' (yesterday: ' + money(n(d[0].s)) + ')' : ''),
        'This week: ' + money(n(w[0].s)) + ' · ' + w[0].n + ' orders',
        byPay.length ? 'By method: ' + fmtList(byPay, p => p.payment + ' ' + money(n(p.s))) : ''
      ].join('\n');
    }
  },
  {
    id: 'new_orders',
    keys: [['new order', 'pending order', 'unpaid order', 'new orders', 'pending orders', 'order waiting', 'need to deliver'], 10],
    async answer() {
      const rows = await q(`SELECT o.*, COALESCE(cu.name,o.customer_name) customer FROM orders o
        LEFT JOIN customers cu ON cu.id=o.user_id WHERE o.status='Pending' ORDER BY o.created_at DESC LIMIT 10`);
      if (!rows.length) return '📭 No pending (unpaid) orders right now. Everything has been confirmed or there are simply no new orders yet.';
      return [
        '🆕 ' + rows.length + ' pending order(s) — customers still need to pay:',
        '',
        ...rows.map(o => `${o.ref} · ${esc(o.customer)} · ${money(n(o.total))} · ${esc(o.payment)} · ${esc(o.phone)} · ${when(o.created_at)}`)
      ].join('\n');
    }
  },
  {
    id: 'recent_orders',
    keys: [['recent order', 'latest order', 'last order', 'last orders', 'show orders', 'list orders'], 8],
    async answer() {
      const rows = await q(`SELECT o.*, COALESCE(cu.name,o.customer_name) customer FROM orders o
        LEFT JOIN customers cu ON cu.id=o.user_id ORDER BY o.created_at DESC LIMIT 10`);
      if (!rows.length) return 'No orders have been placed yet.';
      return [
        '📦 Latest ' + rows.length + ' orders:',
        '',
        ...rows.map(o => `${o.ref} · ${esc(o.customer)} · ${money(n(o.total))} · ${esc(o.status)} · ${esc(o.payment)} · ${when(o.created_at)}`)
      ].join('\n');
    }
  },
  {
    id: 'order_lookup',
    keys: [['order status', 'where is order', 'status of', 'find order', 'check order', 'order ref', 'track order'], 8],
    async answer(input) {
      const m = String(input).match(/MD-[\w-]+/i);
      if (!m) return 'Tell me the order reference (it looks like MD-123456-789) and I will check its status for you.';
      const o = await q(`SELECT o.*, COALESCE(cu.name,o.customer_name) customer FROM orders o
        LEFT JOIN customers cu ON cu.id=o.user_id WHERE o.ref=?`, [m[0].toUpperCase()]);
      if (!o.length) return 'I could not find an order with reference ' + m[0] + '.';
      return [
        '🧾 Order ' + o[0].ref,
        esc(o[0].customer) + ' · ' + esc(o[0].phone),
        'Total ' + money(n(o[0].total)) + ' · paid by ' + esc(o[0].payment),
        'Status: ' + esc(o[0].status) + ' · placed ' + when(o[0].created_at),
        o[0].notes ? 'Note: ' + esc(o[0].notes) : ''
      ].join('\n');
    }
  },
  {
    id: 'customer_lookup',
    keys: [['about customer', 'customer profile', 'find customer', 'look up customer', 'details for', 'info about'], 8],
    async answer(input) {
      const words = String(input).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'for', 'about', 'customer', 'who', 'find', 'give', 'me', 'show', 'info', 'details', 'look', 'up', 'with', 'email', 'name', 'phone'].includes(w));
      if (!words.length) return 'Tell me the customer\'s name, email or phone and I will pull up their full profile.';
      const like = words.map(w => '%' + w + '%');
      const where = words.map(() => '(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)').join(' AND ');
      const vals = like.flatMap(w => [w, w, w]);
      const rows = await q(`SELECT c.* FROM customers c WHERE ${where} ORDER BY c.created_at DESC LIMIT 1`, vals);
      if (!rows.length) return 'I could not find a customer matching that. Try their exact name, email or phone.';
      const c = rows[0];
      const spent = await q('SELECT COUNT(*) orders, COALESCE(SUM(total),0) spent FROM orders WHERE user_id=?', [c.id]);
      const last = await q('SELECT ref,total,status,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 1', [c.id]);
      return [
        '📇 Customer profile',
        '',
        '👤 ' + c.name,
        '📧 ' + c.email,
        '📱 ' + (c.phone || '—'),
        '⭐ ' + n(c.points) + ' points · 🛒 ' + n(spent[0].orders) + ' order(s) · ' + money(n(spent[0].spent)) + ' lifetime',
        '📅 Joined ' + when(c.created_at),
        last[0] ? '🧾 Last order ' + last[0].ref + ' · ' + money(n(last[0].total)) + ' · ' + last[0].status + ' · ' + when(last[0].created_at) : 'No orders yet.'
      ].join('\n');
    }
  },
  {
    id: 'overview',
    keys: [['total revenue', 'total money', 'all revenue', 'total orders', 'how many orders', 'how many customers', 'total customers', 'overall', 'business doing', 'stats'], 7],
    async answer() {
      const rev = await q('SELECT COALESCE(SUM(total),0) s, COUNT(*) n FROM orders WHERE status <> \'Cancelled\'');
      const cust = await q('SELECT COUNT(*) n FROM customers');
      const tod = await q("SELECT COUNT(*) n FROM orders WHERE DATE(created_at)=CURDATE()");
      const prod = await q('SELECT COUNT(*) n FROM products WHERE available=1');
      return [
        '📊 MOOD at a glance',
        '',
        '💵 Total revenue: ' + money(n(rev[0].s)) + ' (' + rev[0].n + ' orders)',
        '👥 Customers: ' + cust[0].n,
        '📦 Orders today: ' + tod[0].n,
        '☕ Products live: ' + prod[0].n
      ].join('\n');
    }
  },
  {
    id: 'top_products',
    keys: [['top product', 'best seller', 'most sold', 'popular product', 'best selling', 'most popular', 'which product sells'], 8],
    async answer() {
      const rows = await q(`SELECT oi.name, SUM(oi.qty) n, COALESCE(SUM(oi.price*oi.qty),0) s
        FROM order_items oi JOIN orders o ON o.id=oi.order_id
        WHERE o.status <> 'Cancelled' GROUP BY oi.name ORDER BY n DESC LIMIT 5`);
      if (!rows.length) return 'No sales yet to rank products. Once orders come in I will show your best sellers here.';
      return [
        '🏆 Best sellers',
        '',
        ...rows.map((p, i) => `${i + 1}. ${esc(p.name)} — ${p.n} sold · ${money(n(p.s))}`)
      ].join('\n');
    }
  },
  {
    id: 'payments_overview',
    keys: [['payment method', 'paid by', 'how paid', 'payment breakdown', 'mtn orders', 'airtel orders'], 7],
    async answer() {
      const rows = await q("SELECT payment, COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE status <> 'Cancelled' GROUP BY payment ORDER BY n DESC");
      if (!rows.length) return 'No paid orders yet to break down by method.';
      return [
        '💳 Payment methods used',
        '',
        ...rows.map(p => `${esc(p.payment)} — ${p.n} order(s) · ${money(n(p.s))}`)
      ].join('\n');
    }
  },
  {
    id: 'insights',
    keys: [['insight', 'learn', 'trend', 'repeat customer', 'best day', 'average order', 'analyse', 'analyze', 'suggestion', 'improve', 'bestselling category'], 8],
    async answer() {
      const top = await q(`SELECT oi.name, SUM(oi.qty) n FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status <> 'Cancelled' GROUP BY oi.name ORDER BY n DESC LIMIT 3`);
      const avg = await q("SELECT AVG(total) a FROM orders WHERE status <> 'Cancelled'");
      const repeat = await q("SELECT COUNT(*) n FROM (SELECT user_id FROM orders WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*) > 1) t");
      const cust = await q('SELECT COUNT(*) n FROM customers');
      const weekday = await q(`SELECT DAYNAME(created_at) d, COALESCE(AVG(total),0) a FROM orders WHERE status <> 'Cancelled' GROUP BY DAYNAME(created_at) ORDER BY a DESC LIMIT 1`);
      const cat = await q(`SELECT c.name, SUM(oi.qty) n FROM order_items oi
        JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id
        JOIN categories c ON c.id=p.cat_id WHERE o.status <> 'Cancelled'
        GROUP BY c.name ORDER BY n DESC LIMIT 1`);
      return [
        '🧠 Learning from your data',
        '',
        top.length ? '🔥 Top sellers: ' + fmtList(top, p => esc(p.name) + ' (' + p.n + ')') : 'No sales data yet.',
        avg[0].a ? '🧾 Average order value: ' + money(n(avg[0].a)) : '',
        n(cust[0].n) ? '🔄 Repeat customers: ' + n(repeat[0].n) + ' of ' + cust[0].n + ' (' + Math.round(n(repeat[0].n) / n(cust[0].n) * 100) + '%)' : 'No customers yet.',
        weekday[0].d ? '📅 Your best day: ' + esc(weekday[0].d) + ' (avg ' + money(n(weekday[0].a)) + '/order)' : '',
        cat[0].n ? '🗂️ Strongest category: ' + esc(cat[0].name) : '',
        '',
        'Tip: ' + (n(repeat[0].n) < n(cust[0].n) / 2 ? 'Few customers order twice — consider a loyalty push or a welcome discount to build returning regulars.' : 'Good returning-customer base — keep the loyalty program active to keep them coming back.')
      ].filter(Boolean).join('\n');
    }
  },
  {
    id: 'wallet_info',
    keys: [['wallet', 'balance', 'money in', 'money out', 'money-in', 'money-out', 'cash on hand', 'ledger', 'how much in', 'how much out'], 7],
    async answer() {
      const rows = await q("SELECT tx_type, COALESCE(SUM(amount),0) s FROM wallet_tx WHERE status='successful' GROUP BY tx_type");
      const inn = n((rows.find(r => r.tx_type === 'in') || {}).s);
      const out = n((rows.find(r => r.tx_type === 'out') || {}).s);
      const paypack = await q("SELECT COALESCE(SUM(amount),0) s FROM wallet_tx WHERE method='paypack' AND status='successful'");
      return [
        '💼 Money control',
        '',
        '🏦 Shop balance: ' + money(inn - out),
        '⬇️ Money in: ' + money(inn),
        '⬆️ Money out: ' + money(out),
        '📲 Sent out via Paypack: ' + money(n(paypack[0].s)),
        '',
        'Open the Money tab to record a transaction or export the CSV.'
      ].join('\n');
    }
  },
  {
    id: 'flags',
    keys: [['payment flag', 'payment problem', 'failed payment', 'failed charge', 'refund', 'dispute'], 7],
    async answer() {
      const rows = await q(`SELECT * FROM payment_events WHERE event LIKE '%failed' ORDER BY created_at DESC LIMIT 8`);
      if (!rows.length) return '✅ No payment flags right now — every gateway event looks clean.';
      return [
        '🚩 ' + rows.length + ' payment flag(s) to review:',
        '',
        ...rows.map(f => `${f.order_ref || '—'} · ${esc(f.gateway)} ${esc(f.event)} · ${money(n(f.amount))} · ${esc(f.client || '')} · ${when(f.created_at)}`)
      ].join('\n');
    }
  },
  {
    id: 'reservations_today',
    keys: [['reservation today', 'booking today', 'table booking', 'reservations today', 'bookings'], 6],
    async answer() {
      const rows = await q(`SELECT * FROM reservations WHERE res_date=CURDATE() AND status<>'Cancelled' ORDER BY res_time`);
      if (!rows.length) return '📅 No table bookings for today yet.';
      return [
        '🪑 Table bookings today (' + rows.length + '):',
        '',
        ...rows.map(b => `${esc(b.res_time)} · ${esc(b.name)} · ${b.guests} guest(s) · ${esc(b.phone)} · ${esc(b.status)}`)
      ].join('\n');
    }
  }
];

// ── CUSTOMER ASSISTANT ──────────────────────────────
const CUSTOMER_INTENTS = [
  {
    id: 'menu',
    keys: [['menu', 'product', 'price', 'how much', 'what do you sell', 'order', 'coffee', 'pastry', 'bread', 'buy', 'drink', 'food'], 6],
    async answer() {
      const rows = await q(`SELECT p.name, p.price, c.name cat FROM products p
        JOIN categories c ON c.id=p.cat_id WHERE p.available=1 ORDER BY c.sort, p.id LIMIT 12`);
      if (!rows.length) return 'Our menu is being updated right now — please check back soon!';
      return [
        '☕ Here is a taste of our menu:',
        '',
        ...rows.map(p => `${esc(p.name)} — ${money(n(p.price))} (${esc(p.cat)})`),
        '',
        'Head to the Shop tab to order, or ask me about a specific item!'
      ].join('\n');
    }
  },
  {
    id: 'product',
    keys: [['price of', 'how much is', 'how much for', 'cost of', 'about the', 'tell me about'], 7],
    async answer(input) {
      const words = String(input).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'for', 'about', 'price', 'much', 'tell', 'cost', 'what', 'and', 'you', 'your'].includes(w));
      if (!words.length) return 'Ask me about a specific item, e.g. "how much is the Latte d\'Or?"';
      const like = words.map(w => '%' + w + '%');
      const where = words.map(() => 'p.name LIKE ? OR p.description LIKE ?').join(' AND ');
      const vals = like.flatMap(w => [w, w]);
      const rows = await q(`SELECT p.*, c.name cat FROM products p JOIN categories c ON c.id=p.cat_id WHERE p.available=1 AND (${where}) LIMIT 1`, vals);
      if (!rows.length) return 'I couldn\'t find that item on the menu. Try another name — e.g. "Doppio Classico" or "Almond Croissant".';
      return [
        esc(rows[0].name) + ' — ' + money(n(rows[0].price)),
        '🏷️ ' + esc(rows[0].cat),
        esc(rows[0].description || ''),
        '',
        'Add it to your cart in the Shop tab!'
      ].join('\n');
    }
  },
  {
    id: 'delivery',
    keys: [['deliver', 'how long', 'delivery time', 'delivery fee', 'delivery cost', 'free delivery', 'delivery zone', 'zones', 'wait'], 8],
    async answer() {
      const st = await q('SELECT delivery_time, delivery_fee, free_delivery, delivery_zones FROM settings WHERE id=1');
      const s = st[0] || {};
      return [
        '🛵 Delivery info',
        'Time: ' + esc(s.delivery_time || '20-35 minutes'),
        n(s.free_delivery) ? 'Free delivery on orders over ' + money(n(s.free_delivery)) + ' (otherwise ' + money(n(s.delivery_fee)) + ')' : 'Delivery fee: ' + money(n(s.delivery_fee)),
        'Zones: ' + esc(s.delivery_zones || 'Kigali City Centre')
      ].join('\n');
    }
  },
  {
    id: 'loyalty',
    keys: [['loyalty', 'points', 'reward', 'free coffee', 'free pastry', 'stamp card'], 7],
    async answer() {
      const st = await q('SELECT points_value, loyalty_threshold FROM settings WHERE id=1');
      const s = st[0] || {};
      const thr = Math.max(1, n(s.loyalty_threshold) || 100);
      const val = n(s.points_value);
      return [
        '⭐ MOOD loyalty',
        'Earn 1 point for every ' + money(1) + ' you spend.',
        'Reach ' + thr + ' points and we automatically turn them into a free reward code (coffee or pastry) you can use at checkout.',
        val > 0 ? 'Your points are worth ' + money(val) + ' each when you redeem them.' : '',
        'Sign in and check "My Rewards" to see your balance and codes.'
      ].filter(Boolean).join('\n');
    }
  },
  {
    id: 'giftcards',
    keys: [['gift card', 'giftcard', 'gift', 'voucher', 'give a treat', 'send someone'], 6],
    async answer() {
      return [
        '🎁 Gift cards',
        'You can buy a digital MOOD gift card and email it straight to a friend.',
        'In the shop, pick a value (1–' + (CUR === 'RWF' ? '500' : '500') + '), add a message, and the code is delivered by email.',
        'The recipient enters the code at checkout to pay for their coffee and bread.'
      ].join('\n');
    }
  },
  {
    id: 'reservations',
    keys: [['reservation', 'book a table', 'book table', 'table booking', 'reserve', 'booking'], 7],
    async answer() {
      return [
        '🪑 Table reservations',
        'Book a table from the "Reserve" button on our site — pick a date, time and number of guests.',
        'You need to be signed in. We will confirm your booking and you can view it under My Reservations.'
      ].join('\n');
    }
  },
  {
    id: 'contact',
    keys: [['contact', 'phone', 'call', 'address', 'location', 'where are you', 'email', 'reach you', 'find you'], 7],
    async answer() {
      const st = await q('SELECT name, phone, address, email FROM settings WHERE id=1');
      const s = st[0] || {};
      return [
        '📍 ' + esc(s.name || 'MOOD Coffee Shop & Bakery'),
        'Phone: ' + esc(s.phone || '—'),
        'Email: ' + esc(s.email || '—'),
        'Address: ' + esc(s.address || '—')
      ].join('\n');
    }
  },
  {
    id: 'payments',
    keys: [['payment', 'pay', 'cash', 'mtn', 'airtel', 'mobile money', 'card'], 6],
    async answer() {
      return [
        '💳 How to pay',
        'MTN MoMo, Airtel Money and bank cards are supported online.',
        'Mobile money pushes a prompt to your phone — approve it to confirm the order. Cards are encrypted and processed securely.',
        'You can also pay cash on delivery where available.'
      ].join('\n');
    }
  },
  {
    id: 'my_orders',
    keys: [['my order', 'my orders', 'where is my order', 'my purchase', 'order status', 'track my'], 8],
    async answer(input, u) {
      if (!u) return 'Please sign in first, then ask me about your orders and I will show you exactly where each one is.';
      const rows = await q('SELECT ref,status,total,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 5', [u.id]);
      if (!rows.length) return 'You have no orders yet — your first MOOD order is waiting! ☕';
      return [
        '📦 Your recent orders:',
        '',
        ...rows.map(o => `${o.ref} · ${esc(o.status)} · ${money(n(o.total))} · ${when(o.created_at)}`)
      ].join('\n');
    }
  },
  {
    id: 'my_points',
    keys: [['my points', 'my reward', 'points balance', 'how many points'], 8],
    async answer(input, u) {
      if (!u) return 'Please sign in so I can check your points balance.';
      return '⭐ You currently have ' + n(u.points) + ' loyalty points. Keep earning — at the threshold they become a free coffee or pastry!';
    }
  },
  {
    id: 'announcements',
    keys: [['announcement', 'news', 'what\'s new', 'update', 'special offer', 'promotion', 'promo'], 6],
    async answer() {
      const rows = await q("SELECT title,message FROM announcements WHERE status=1 ORDER BY created_at DESC LIMIT 3");
      if (!rows.length) return 'No announcements right now — but follow us for news and offers!';
      return ['📢 Latest from MOOD', '', ...rows.map(a => esc(a.title || 'Announcement') + '\n' + esc(a.message))].join('\n');
    }
  },
  {
    id: 'hours',
    keys: [['open', 'clos', 'hours', 'time', 'when are you'], 6],
    async answer() {
      return [
        '🕐 We are open 7 days a week, 7am – 8pm.',
        'Delivery follows our delivery times — check with the Delivery question.',
        'Drop by, say hi, and grab a coffee! ☕'
      ].join('\n');
    }
  }
];

// ── fallback ────────────────────────────────────────
function adminHelp() {
  return [
    '🤖 I\'m your MOOD admin assistant. Ask me things like:',
    '',
    '• "Who is the latest customer?"',
    '• "How much did we earn today?"',
    '• "What new orders do we have?"',
    '• "Show me recent orders"',
    '• "Find customer Keza" or "order MD-123456-789"',
    '• "What are our best sellers?"',
    '• "Give me insights / trends"',
    '• "Wallet balance" or "payment flags"'
  ].join('\n');
}
function customerHelp() {
  return [
    '☕ Hi! I\'m the MOOD assistant. I can help with:',
    '',
    '• "What\'s on the menu?" / "How much is the Latte d\'Or?"',
    '• "Delivery time and fees?"',
    '• "How do loyalty points work?"',
    '• "Gift cards", "book a table", "how do I pay?"',
    '• "Where are you located?" / "Your hours?"',
    '• "My orders" (after you sign in)'
  ].join('\n');
}

// ── main entry ──────────────────────────────────────
async function chat({ role, input, user }) {
  await loadCur();
  const text = String(input || '').trim();
  if (!text) return { answer: role === 'admin' ? adminHelp() : customerHelp(), intent: 'help' };
  const list = role === 'admin' ? ADMIN_INTENTS : CUSTOMER_INTENTS;

  // Direct intent if any individual intent's top keyword is the literal text.
  let best = null, bestScore = 0;
  for (const it of list) {
    const s = score(text, [it.keys]);
    if (s > bestScore) { bestScore = s; best = it; }
  }

  const intent = best ? best.id : 'help';
  let answer;
  try {
    if (best) {
      answer = await best.answer(text, user);
    } else {
      answer = role === 'admin' ? adminHelp() : customerHelp();
    }
  } catch (e) {
    answer = 'Sorry — I ran into a problem answering that. Please try again in a moment.';
  }

  // Log the exchange so the shop can see what people ask and improve.
  try {
    await q('INSERT INTO ai_chats (role,user_id,query,intent,answer) VALUES (?,?,?,?,?)',
      [role, user && user.id ? user.id : null, text.slice(0, 300), intent, answer.slice(0, 1500)]);
  } catch (e) { /* logging is optional */ }

  return { answer, intent };
}

module.exports = { chat };
