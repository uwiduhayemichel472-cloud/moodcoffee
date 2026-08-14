/* MOOD Admin — plain vanilla, no frameworks */
const $ = id => document.getElementById(id);
let admin = null, panel = 'overview';
let S = { settings: {} };
let catsCache = [], confirmCb = null;
let lockMs = 5 * 60000, lastAct = Date.now();
const ALL_PERMS = [
  ['overview', 'Dashboard'], ['products', 'Products'], ['categories', 'Categories'], ['orders', 'Orders'],
  ['customers', 'Customers'], ['promos', 'Promo Codes'], ['settings', 'Settings'],
  ['notifications', 'Notifications'], ['announcements', 'Announcements'], ['reports', 'Reports'],
  ['reviews', 'Reviews'], ['reservations', 'Reservations'], ['giftcards', 'Gift Cards'], ['payouts', 'Withdrawals'], ['paypack', 'Money']
];
const can = p => !!admin && (admin.isSuper || (admin.perms || []).includes(p));
const permLabel = p => (ALL_PERMS.find(x => x[0] === p) || [p, p])[1];

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const money = v => (S.settings && S.settings.currency === 'RWF' ? 'RWF ' : '$') + Number(v || 0).toFixed(S.settings && S.settings.currency === 'RWF' ? 0 : 2);
const dt = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleString('en',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); };
const qs = o => new URLSearchParams(o || {}).toString();

async function api(url, opts = {}) {
  const r = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  let d = {};
  try { d = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600); }
const MODAL_PAIRS = { prodModal: 'prodOvl', catModal: 'catOvl', cfModal: 'cfOvl', admModal: 'admOvl', gcModal: 'gcOvl' };
function ovlOf(m) { return MODAL_PAIRS[m] || m; }
function openModal(m) { const o = ovlOf(m); if ($(o)) $(o).classList.add('open'); if ($(m)) $(m).classList.add('open'); }
function closeModal(m) {
  let o = ovlOf(m), modal = m;
  if (!MODAL_PAIRS[m]) for (const k in MODAL_PAIRS) if (MODAL_PAIRS[k] === m) modal = k;
  if ($(o)) $(o).classList.remove('open');
  if ($(modal)) $(modal).classList.remove('open');
}
function confirm(msg, cb) { $('cfT').textContent = 'Confirm'; $('cfM').textContent = msg; confirmCb = cb; openModal('cfModal'); }
function doCf() { closeModal('cfModal'); const cb = confirmCb; confirmCb = null; if (cb) cb(); }

/* ---------------- Auth ---------------- */
async function boot() {
  try {
    const [m, st] = await Promise.all([
      api('/api/admin/me'),
      api('/api/admin/settings').catch(() => null)
    ]);
    admin = m.admin;
    if (st) S.settings = st;
    enterApp();
  } catch (e) {
    const s = await api('/api/admin/status');
    renderAuth(s.setup ? 'setup' : 'login');
  }
}
function renderAuth(mode) {
  $('authScreen').style.display = 'flex';
  $('app').style.display = 'none';
  $('authBody').innerHTML = mode === 'setup'
    ? `<div class="sub">First-time setup</div>
       <form onsubmit="ev(e=>doSetup(e),event)">
         <label>Your name<input id="aNameIn" required></label>
         <label>Email<input id="aMailIn" type="email" required></label>
         <label>Password (6+ characters)<input id="aPassIn" type="password" required minlength="6"></label>
         <button class="gold">Create Admin</button>
       </form><p class="err" id="authErr"></p>`
    : `<div class="sub">Sign in</div>
       <form onsubmit="ev(e=>doLogin(e),event)">
         <label>Email<input id="aMailIn" type="email" required></label>
         <label>Password<input id="aPassIn" type="password" required></label>
         <button class="gold">Sign in</button>
       </form><p class="err" id="authErr"></p>`;
}
function ev(fn, e) { e.preventDefault(); fn(); }
async function doSetup() {
  try {
    const r = await api('/api/admin/setup', { method: 'POST', body: JSON.stringify({ name: $('aNameIn').value, email: $('aMailIn').value, password: $('aPassIn').value }) });
    admin = r.admin; enterApp(); toast('Welcome to MOOD Admin');
  } catch (e) { showAuthErr(e.message); }
}
async function doLogin() {
  try {
    const r = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: $('aMailIn').value, password: $('aPassIn').value }) });
    admin = r.admin; enterApp(); toast('Welcome back');
  } catch (e) { showAuthErr(e.message); }
}
function showAuthErr(m) { const el = $('authErr'); el.textContent = m; el.style.display = 'block'; }
function logout() {
  confirm('Sign out of the MOOD Admin panel?', () => {
    try { api('/api/admin/logout', { method: 'POST', body: '{}' }); } catch (e) {}
    location.reload();
  });
}
function enterApp() {
  $('authScreen').style.display = 'none';
  $('app').style.display = 'flex';
  $('aName').textContent = admin.name;
  $('aEmail').textContent = admin.email;
  const rb = $('aRole'); if (rb) { rb.textContent = admin.isSuper ? 'Super Admin' : 'Staff'; rb.className = 'role-badge ' + (admin.isSuper ? 'super' : 'staff'); }
  lockMs = admin.lockMs || lockMs;
  document.querySelectorAll('.nl').forEach(b => {
    const need = b.dataset.perm;
    const superOnly = b.dataset.super === '1';
    b.style.display = (!superOnly || admin.isSuper) && (!need || can(need)) ? '' : 'none';
  });
  const first = [...document.querySelectorAll('.nl')].find(b => b.style.display !== 'none');
  switchPanel((first && first.dataset.p) || 'overview');
  setInterval(adminLive, 15000);
  setTimeout(adminLive, 4000);
  ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, resetIdle, { passive: true }));
}
function resetIdle() { lastAct = Date.now(); }
setInterval(() => {
  if (admin && Date.now() - lastAct > lockMs) {
    try { api('/api/admin/logout', { method: 'POST', body: '{}' }); } catch (e) {}
    toast('Signed out for inactivity.');
    setTimeout(() => location.reload(), 700);
  }
}, 1000);

// ─── Live sync: new orders & notifications appear without reloading ───
async function adminLive() {
  try {
    const meP = api('/api/admin/me');
    const notifP = can('notifications') ? api('/api/admin/notifications') : Promise.resolve([]);
    const [m, n] = await Promise.all([meP, notifP]);
    admin = m.admin; lockMs = admin.lockMs || lockMs;
    const unread = n.filter(x => !x.is_read).length;
    const dot = $('bellDot');
    if (dot) { dot.style.display = unread ? 'flex' : 'none'; dot.textContent = unread > 9 ? '9+' : unread; }
  } catch (e) {}
  if (panel === 'overview' && can('overview')) loadOverview().then(h => { if (panel === 'overview') $('pan').innerHTML = h; }).catch(() => {});
  else if (panel === 'orders' && can('orders')) loadOrders().then(h => { if (panel === 'orders') $('pan').innerHTML = h; }).catch(() => {});
}

/* ---------------- Navigation ---------------- */
function adminNav() { document.querySelector('aside').classList.toggle('open'); $('burger').classList.toggle('open'); $('navOvl').classList.toggle('show'); }
function adminNavClose() { document.querySelector('aside').classList.remove('open'); $('burger').classList.remove('open'); $('navOvl').classList.remove('show'); }
document.querySelectorAll('.nl').forEach(b => b.addEventListener('click', () => switchPanel(b.dataset.p)));
function switchPanel(p) {
  adminNavClose();
  if (p === 'admins') { if (!admin || !admin.isSuper) p = 'overview'; }
  else if (!can(p)) p = 'overview';
  panel = p;
  document.querySelectorAll('.nl').forEach(b => b.classList.toggle('active', b.dataset.p === p));
  $('title').textContent = { overview: 'Dashboard', products: 'Products', categories: 'Categories', orders: 'Orders', customers: 'Customers', promos: 'Promo Codes', settings: 'Settings', images: 'Site Images', notifications: 'Notifications', announcements: 'Announcements', reports: 'Reports', reviews: 'Reviews', reservations: 'Reservations', giftcards: 'Gift Cards', payouts: 'Withdrawals', paypack: 'Money', ai: 'AI Assistant', admins: 'Team & Admins' }[p] || 'Dashboard';
  const L = { overview: loadOverview, products: loadProducts, categories: loadCategories, orders: loadOrders, customers: loadCustomers, promos: loadPromos, settings: loadSettings, images: loadImages, notifications: loadNotifs, announcements: loadAnnouncements, reports: loadReports, reviews: loadReviews, reservations: loadReservations, giftcards: loadGiftcards, payouts: loadPayouts, paypack: loadMoney, ai: loadAi, admins: loadAdmins };
  $('pan').innerHTML = '<div class="card2"><div class="bd" style="color:#999">Loading…</div></div>';
  L[p]().then(h => $('pan').innerHTML = h).catch(e => $('pan').innerHTML = `<div class="card2"><div class="bd" style="color:#c0392b">${esc(e.message)}</div></div>`);
}

/* ---------------- Dashboard ---------------- */
async function loadOverview() {
  const s = await api('/api/admin/stats');
  return `
  <div class="kpis">
    <div class="kpi"><b>${money(s.revenue)}</b><span>Total revenue</span></div>
    <div class="kpi"><b>${s.orders}</b><span>Orders</span></div>
    <div class="kpi"><b>${s.ordersToday}</b><span>Orders today</span></div>
    <div class="kpi"><b>${s.customers}</b><span>Customers</span></div>
    <div class="kpi"><b>${s.productsActive}/${s.products}</b><span>Products live</span></div>
  </div>
  <div class="grid2">
    <div class="card2"><div class="hd"><b>Revenue — last 7 days</b></div><div class="bd">
      <div class="chart">${s.chart.map(c => `<div><i style="height:${Math.max(2, Math.round((c.value / (Math.max(...s.chart.map(x => x.value)) || 1)) * 110))}px"></i>${esc(c.label)}<small>${c.value ? Math.round(c.value) : ''}</small></div>`).join('')}</div>
    </div></div>
    <div class="card2"><div class="hd"><b>Products per category</b></div><div class="bd">
      ${s.cats.length ? s.cats.map(c => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0ece8;font-size:.84rem"><span>${esc(c.name)}</span><b style="color:#c8956c">${c.n}</b></div>`).join('') : '<p style="color:#888">No categories yet.</p>'}
    </div></div>
  </div>
  ${s.payFlags && s.payFlags.length ? `<div class="card2" style="border-color:#c0392b">
    <div class="hd"><b style="color:#c0392b">Payment flags</b></div><div class="bd">
      ${s.payFlags.map(f => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f0ece8;font-size:.82rem"><span><b>${esc(f.order_ref || '—')}</b> · ${esc(f.gateway)} ${esc(f.event)} · ${esc(f.status)}${Number(f.amount) ? ' · ' + money(f.amount) : ''}${f.client ? ' · ' + esc(f.client) : ''}<div class="d" style="color:#888;font-size:.75rem">${dt(f.created_at)} · gw ref ${esc(f.gw_ref || '')}</div></span><button class="a-btn" style="color:#c0392b;flex:0 0 auto" onclick="delFlag(${f.id})" title="Remove this flag">✕ Remove</button></div>`).join('')}
      <p style="color:#c0392b;font-size:.78rem;margin:8px 0 0">Check the Paypack dashboard for these refs — if the customer was charged but Paypack shows failed, refund them.</p>
    </div></div>` : ''}
  <div class="card2"><div class="hd"><b>Recent orders</b></div><div class="bd">
    <table><tr><th>Ref</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>When</th></tr>
    ${s.recentOrders.map(o => `<tr><td><b>${esc(o.ref)}</b></td><td>${esc(o.customer)}</td><td>${money(o.total)}</td><td>${esc(o.payment)}</td><td><span class="bdg ${esc(o.status)}">${esc(o.status)}</span></td><td>${dt(o.created_at)}</td></tr>`).join('')}
  </table></div></div>`;
}

function delFlag(id) {
  confirm('Remove this payment flag?', async () => {
    try {
      await api('/api/admin/payflags/' + id, { method: 'DELETE' });
      toast('Flag removed');
      loadOverview().then(h => { if (panel === 'overview') $('pan').innerHTML = h; });
    } catch (e) { toast(e.message); }
  });
}

/* ---------------- Products ---------------- */
async function loadProducts() {
  if (!S.settings || !S.settings.currency) { try { S.settings = await api('/api/admin/settings'); } catch (e) {} }
  const [prods, cats] = await Promise.all([api('/api/admin/products'), api('/api/admin/categories')]);
  catsCache = cats;
  return `
  <div class="toolbar">
    <input id="pSearch" placeholder="Search products…" oninput="fp(this.value)">
    <button class="a-btn" onclick="openProd()">+ Add product</button>
  </div>
  <div class="card2"><div class="bd" style="padding:0">
    <table id="pTable"><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Available</th><th>Featured</th><th></th></tr>
    ${prods.map(p => prodRow(p)).join('')}
    </table></div></div>`;
}
function prodRow(p) {
  return `<tr data-name="${esc(p.name.toLowerCase())}" data-cat="${esc((p.cat || '').toLowerCase())}">
    <td>${p.img ? `<img class="mini" src="${esc(p.img)}">` : `<span class="mini">${esc(p.emoji || '☕')}</span>`}</td>
    <td><b>${esc(p.name)}</b></td><td>${esc(p.cat)}</td><td>${money(p.price)}</td>
    <td><span class="bdg ${p.avail ? 'on' : 'off'}" style="cursor:pointer" onclick="tog(${p.id},'available',${p.avail ? 0 : 1},this)">${p.avail ? 'Live' : 'Hidden'}</span></td>
    <td><span class="bdg ${p.feat ? 'on' : 'off'}" style="cursor:pointer" onclick="tog(${p.id},'featured',${p.feat ? 0 : 1},this)">${p.feat ? 'Featured' : '—'}</span></td>
    <td><button class="a-btn" onclick="openProd(${p.id})">Edit</button> <button class="a-btn red" onclick="delProd(${p.id},'${esc(p.name)}')">Delete</button></td>
  </tr>`;
}
function fp(v) {
  document.querySelectorAll('#pTable tr[data-name]').forEach(tr => {
    const ok = !v || tr.dataset.name.includes(v.toLowerCase()) || tr.dataset.cat.includes(v.toLowerCase());
    tr.style.display = ok ? '' : 'none';
  });
}
async function tog(id, field, val, el) {
  try {
    await api('/api/admin/products/' + id, { method: 'PATCH', body: JSON.stringify({ [field]: val }) });
    el.className = 'bdg ' + (val ? 'on' : 'off');
    el.textContent = field === 'available' ? (val ? 'Live' : 'Hidden') : (val ? 'Featured' : '—');
    toast('Saved');
  } catch (e) { toast(e.message); }
}
async function delProd(id, name) {
  confirm(`Delete "${name}"? This cannot be undone.`, async () => {
    try { await api('/api/admin/products/' + id, { method: 'DELETE' }); loadProducts().then(h => $('pan').innerHTML = h); toast('Product deleted'); }
    catch (e) { toast(e.message); }
  });
}
async function openProd(id) {
  $('pErr').style.display = 'none';
  const prods = id ? await api('/api/admin/products') : [];
  const p = id ? prods.find(x => x.id === id) : null;
  $('prodTitle').textContent = id ? 'Edit Product' : 'Add Product';
  $('pId').value = id || '';
  $('pName').value = p ? p.name : '';
  $('pPrice').value = p ? p.price : '';
  $('pDesc').value = p ? p.desc : '';
  $('pEmoji').value = p ? (p.emoji || '') : '';
  $('pImg').value = p ? (p.img || '') : '';
  $('pAvail').checked = p ? !!p.avail : true;
  $('pFeat').checked = p ? !!p.feat : false;
  $('pCat').innerHTML = catsCache.map(c => `<option value="${c.id}" ${p && p.catId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  openModal('prodModal');
}
function upImg(e) {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 4 * 1024 * 1024) { toast('Image too large — max 4 MB.'); e.target.value = ''; return; }
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      const MAX = 800;
      if (Math.max(w, h) > MAX) {
        const s = MAX / Math.max(w, h);
        w = Math.round(w * s); h = Math.round(h * s);
      }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      $('pImg').value = cv.toDataURL('image/jpeg', 0.72);
      toast('Image ready');
    };
    img.onerror = () => toast('Could not read that image.');
    img.src = rd.result;
  };
  rd.readAsDataURL(f);
}
async function saveProd() {
  const body = {
    name: $('pName').value, catId: $('pCat').value, price: $('pPrice').value,
    desc: $('pDesc').value, emoji: $('pEmoji').value, img: $('pImg').value,
    avail: $('pAvail').checked, feat: $('pFeat').checked
  };
  try {
    if ($('pId').value) await api('/api/admin/products/' + $('pId').value, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/products', { method: 'POST', body: JSON.stringify(body) });
    closeModal('prodModal'); loadProducts().then(h => $('pan').innerHTML = h); toast('Saved');
  } catch (e) { $('pErr').textContent = e.message; $('pErr').style.display = 'block'; }
}

/* ---------------- Categories ---------------- */
async function loadCategories() {
  const c = await api('/api/admin/categories');
  return `
  <div class="toolbar"><button class="a-btn" onclick="openCat()">+ Add category</button></div>
  <div class="card2"><div class="bd" style="padding:0">
    <table><tr><th></th><th>Name</th><th>Service</th><th>Products</th><th></th></tr>
    ${c.map(x => `<tr><td>${x.image ? `<img class="mini" src="${esc(x.image)}">` : '<span class="mini">📂</span>'}</td><td><b>${esc(x.name)}</b></td><td><span class="role-badge ${x.service === 'bakery' ? 'staff' : 'super'}">${x.service === 'bakery' ? 'Bakery' : 'Coffee'}</span></td><td>${x.count}</td><td><button class="a-btn red" onclick="delCat(${x.id},'${esc(x.name)}')">Delete</button></td></tr>`).join('')}
    </table></div></div>`;
}
let promoMode = false;
function openPromo() {
  promoMode = true;
  $('cErr').style.display = 'none';
  $('catModal').querySelector('.mh b').textContent = 'Add Promo Code';
  $('catModal').querySelector('.fg:first-child label').innerHTML = 'Code *';
  $('cName').value = '';
  $('cField3').style.display = 'none';
  $('cField2').style.display = 'block';
  $('cField2').innerHTML = '<label>Discount % (1-100) *<input id="cDisc" type="number" min="1" max="100" value="10"></label>';
  openModal('catModal');
}
function openCat() {
  promoMode = false;
  $('cErr').style.display = 'none';
  $('catModal').querySelector('.mh b').textContent = 'Add Category';
  $('catModal').querySelector('.fg:first-child label').innerHTML = 'Name *';
  $('cName').value = '';
  $('cField2').style.display = 'block';
  $('cField3').style.display = 'block';
  $('cField2').innerHTML = '<label>Image URL<input id="cImg"></label>';
  $('cSvc').value = 'coffee';
  openModal('catModal');
}
async function saveCat() {
  try {
    if (promoMode) await api('/api/admin/promos', { method: 'POST', body: JSON.stringify({ code: $('cName').value, discount: $('cDisc').value }) });
    else await api('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name: $('cName').value, image: $('cImg').value, service: $('cSvc').value }) });
    closeModal('catModal');
    if (promoMode) loadPromos().then(h => $('pan').innerHTML = h);
    else loadCategories().then(h => $('pan').innerHTML = h);
    toast('Saved');
  } catch (e) { $('cErr').textContent = e.message; $('cErr').style.display = 'block'; }
}
function delCat(id, name) {
  confirm(`Delete category "${name}"?`, async () => {
    try { await api('/api/admin/categories/' + id, { method: 'DELETE' }); loadCategories().then(h => $('pan').innerHTML = h); toast('Deleted'); }
    catch (e) { toast(e.message); }
  });
}

/* ---------------- Orders ---------------- */
async function loadOrders() {
  const o = await api('/api/admin/orders');
  return `
  <div class="toolbar">
    <input id="oSearch" placeholder="Search ref, customer, phone…" oninput="fo(this.value)">
    <select id="oFilter" onchange="fo()" style="width:160px">
      <option value="">All statuses</option><option>Preparing</option><option>Pending</option><option>Delivered</option><option>Cancelled</option>
    </select>
  </div>
  <div class="card2"><div class="bd" style="padding:0">
    <table id="oTable"><tr><th>Ref</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>When</th></tr>
    ${o.map(ordRow).join('')}
    </table></div></div>`;
}
function ordRow(o) {
  const its = o.items.map(i => `${esc(i.emoji || '')} ${i.qty}× ${esc(i.name)}`).join('<br>');
  return `<tr data-ref="${esc((o.ref || '').toLowerCase())}" data-cust="${esc((o.user || '').toLowerCase())}" data-ph="${esc((o.phone || '').toLowerCase())}" data-st="${esc(o.status)}">
    <td><b>${esc(o.ref)}</b><br><small style="color:#7a5c44">${esc(o.address || '')}</small></td>
    <td>${esc(o.user)}<br><small style="color:#7a5c44">${esc(o.phone || '')}</small></td>
    <td style="font-size:.76rem">${its}</td>
    <td>${money(o.total)}${o.discount ? `<br><small style="color:#2d6a4f">−${money(o.discount)}</small>` : ''}</td>
    <td>${esc(o.payment)}</td>
    <td><select style="width:130px;margin:0" onchange="setStatus(${o.id},this.value)">${['Preparing','Pending','Delivered','Cancelled'].map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td>${dt(o.date)}</td>
  </tr>`;
}
function fo() {
  const q = ($('oSearch') ? $('oSearch').value : '').toLowerCase();
  const f = $('oFilter') ? $('oFilter').value : '';
  document.querySelectorAll('#oTable tr[data-ref]').forEach(tr => {
    const ok = (!f || tr.dataset.st === f) && (!q || tr.dataset.ref.includes(q) || tr.dataset.cust.includes(q) || tr.dataset.ph.includes(q));
    tr.style.display = ok ? '' : 'none';
  });
}
async function setStatus(id, st) {
  try { await api('/api/admin/orders/' + id, { method: 'PUT', body: JSON.stringify({ status: st }) }); toast('Order updated'); }
  catch (e) { toast(e.message); loadOrders().then(h => $('pan').innerHTML = h); }
}

/* ---------------- Customers ---------------- */
async function loadCustomers() {
  const c = await api('/api/admin/customers');
  return `
  <div class="toolbar"><input id="cSearch" placeholder="Search customers…" oninput="fc(this.value)"></div>
  <div class="card2"><div class="bd" style="padding:0">
    <table id="cTable"><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Spent</th><th>Points</th><th>Joined</th><th></th></tr>
    ${c.map(u => `<tr data-f="${esc((u.name + ' ' + u.email).toLowerCase())}"><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${esc(u.phone || '—')}</td><td>${u.orders}</td><td>${money(u.spent)}</td><td><span class="bdg on">${u.points || 0} pts</span></td><td>${dt(u.created_at)}</td><td><button class="a-btn red" onclick="delCust(${u.id},'${esc(u.name)}')">Delete</button></td></tr>`).join('')}
    </table></div></div>`;
}
function fc(v) {
  document.querySelectorAll('#cTable tr[data-f]').forEach(tr => tr.style.display = !v || tr.dataset.f.includes(v.toLowerCase()) ? '' : 'none');
}
function delCust(id, name) {
  confirm(`Delete customer "${name}" and their account?`, async () => {
    try { await api('/api/admin/customers/' + id, { method: 'DELETE' }); loadCustomers().then(h => $('pan').innerHTML = h); toast('Deleted'); }
    catch (e) { toast(e.message); }
  });
}

/* ---------------- Promos ---------------- */
async function loadPromos() {
  const p = await api('/api/admin/promos');
  return `
  <div class="toolbar"><button class="a-btn" onclick="openPromo()">+ Add code</button></div>
  <div class="card2"><div class="bd">
    <div class="chips">${p.map(x => `<span class="chip"><b>${esc(x.code)}</b>${x.discount}% off <button class="a-btn red" style="margin-left:6px;padding:2px 8px" onclick="delPromo(${x.id})">×</button></span>`).join('') || '<p style="color:#888">No promo codes yet.</p>'}</div>
  </div></div>`;
}
function delPromo(id) {
  confirm('Delete this promo code?', async () => {
    try { await api('/api/admin/promos/' + id, { method: 'DELETE' }); loadPromos().then(h => $('pan').innerHTML = h); toast('Deleted'); }
    catch (e) { toast(e.message); }
  });
}

/* ---------------- Settings ---------------- */
async function loadSettings() {
  const s = await api('/api/admin/settings');
  S.settings = s;
  const t = s.toggles || {};
  const tgl = (k, label) => `<div class="setrow"><span>${esc(label)}</span><label class="tgl"><input type="checkbox" ${t[k] ? 'checked' : ''} onchange="setTgl('${k}',this.checked)"><i></i></label></div>`;
  return `
  <div class="grid2">
    <div class="card2"><div class="hd"><b>Store details</b></div><div class="bd">
      <div class="fg"><label>Store name<input id="sName" value="${esc(s.name)}"></label></div>
      <div class="fg"><label>Tagline<input id="sTag" value="${esc(s.tagline)}"></label></div>
      <div class="fg"><label>Contact email<input id="sMail" value="${esc(s.email)}"></label></div>
      <div class="fg"><label>Phone<input id="sPhone" value="${esc(s.phone)}"></label></div>
      <div class="fg"><label>Address<input id="sAddr" value="${esc(s.address)}"></label></div>
      <div class="fg2">
        <div><label>Currency<input id="sCur" value="${esc(s.currency)}"></label></div>
        <div><label>Delivery time<input id="sTime" value="${esc(s.deliveryTime || '')}"></label></div>
      </div>
      <div class="fg2">
        <div><label>Delivery fee<input id="sFee" type="number" value="${s.deliveryFee}"></label></div>
        <div><label>Free delivery over<input id="sFree" type="number" value="${s.freeDelivery}"></label></div>
      </div>
      <div class="fg"><label>Delivery zones<input id="sZones" value="${esc(s.deliveryZones || '')}"></label></div>
      <button class="gold" style="max-width:200px" onclick="saveSettings()">Save settings</button>
    </div></div>
    <div class="card2"><div class="hd"><b>Storefront toggles</b></div><div class="bd">
      ${tgl('ord', 'Accept orders')}${tgl('reg', 'Allow registration')}
      ${tgl('pp', 'PayPal / card')}${tgl('mtn', 'MTN MoMo')}${tgl('airtel', 'Airtel Money')}
      ${tgl('card', 'Show prices')}${tgl('maint', 'Maintenance mode')}
    </div></div>
    <div class="card2"><div class="hd"><b>Loyalty points</b></div><div class="bd">
      ${tgl('loyalty', 'Enable loyalty points')}
      <div class="fg"><label>1 point = $<input id="sPtsVal" type="number" step="0.001" min="0" value="${s.pointsValue}"></label></div>
      <div class="fg"><label>Points for a free reward<input id="sPtsThr" type="number" min="1" step="1" value="${s.loyaltyThreshold}"></label></div>
      <p style="font-size:.74rem;color:#7a5c44;margin:-4px 0 12px">Customers earn 1 point per $1 spent. When their balance reaches this many points it is automatically turned into a free-reward code (coffee or pastry) they can redeem at checkout.</p>
      <button class="gold" style="max-width:200px" onclick="savePoints()">Save loyalty settings</button>
    </div></div>
    <div class="card2"><div class="hd"><b>Languages</b></div><div class="bd">
      <p style="font-size:.74rem;color:#7a5c44;margin:-4px 0 12px">Choose which languages visitors can use on the website. Disabled languages are hidden from the language menu.</p>
      ${tgl('lang_en', 'English')}${tgl('lang_fr', 'Français (French)')}${tgl('lang_rw', 'Kinyarwanda')}
    </div></div>
    <div class="card2"><div class="hd"><b>Security</b></div><div class="bd">
      <div class="fg"><label>Current password<input id="pwCur" type="password"></label></div>
      <div class="fg"><label>New password<input id="pwNew" type="password"></label></div>
      <div class="fg"><label>Confirm new password<input id="pwCon" type="password"></label></div>
      <div class="err" id="pwErr"></div>
      <button class="gold" style="max-width:200px" onclick="changePw()">Update password</button>
    </div></div>
    <div class="card2"><div class="hd"><b>Reviews</b></div><div class="bd">
      <div class="fg"><label>Maximum comment length (characters)<input id="sMaxRev" type="number" min="20" max="2000" value="${s.maxReviewLen}"></label></div>
      <p style="font-size:.74rem;color:#7a5c44;margin:-4px 0 12px">Customers' review comments are limited to this many characters (20–2000).</p>
      <button class="gold" style="max-width:200px" onclick="saveSettings()">Save reviews setting</button>
    </div></div>
    ${admin.isSuper ? `
    <div class="card2"><div class="hd"><b>Email (SMTP) — newsletter alerts</b></div><div class="bd">
      <p style="font-size:.74rem;color:#7a5c44;margin:-4px 0 12px">When a visitor signs up for the newsletter, a notice is emailed to the contact address above. Leave everything blank to keep the site running without emails.</p>
      <div class="fg2">
        <div><label>SMTP host<input id="smtpHost" value="${esc((s.smtp || {}).host || '')}" placeholder="smtp.gmail.com"></div>
        <div><label>Port<input id="smtpPort" type="number" value="${(s.smtp || {}).port || 465}"></div>
      </div>
      <div class="fg2">
        <div><label>Username<input id="smtpUser" value="${esc((s.smtp || {}).user || '')}"></div>
        <div><label>From address<input id="smtpFrom" value="${esc((s.smtp || {}).from || '')}" placeholder="MOOD Cafe <hello@example.com>"></div>
      </div>
      <div class="fg"><label>Password<input id="smtpPass" type="password" value="${esc((s.smtp || {}).pass || '')}" autocomplete="new-password"></label></div>
      <label style="display:flex;align-items:center;gap:8px;text-transform:none;font-size:.8rem;color:#5c2e0a;margin-bottom:12px"><input type="checkbox" id="smtpSecure" ${(s.smtp || {}).secure === false ? '' : 'checked'} style="width:auto;margin:0"> Use a secure connection (SSL/TLS)</label>
      <p style="font-size:.74rem;color:#7a5c44;margin:-4px 0 12px">Port 465 usually uses SSL; port 587 usually does not. The password is kept in the database and shown masked to other admins.</p>
      <button class="gold" style="max-width:200px" onclick="saveSmtp()">Save email settings</button>
    </div></div>` : ''}
    ${admin.isSuper ? `
    <div class="card2"><div class="hd"><b>Auto-lock (idle logout)</b></div><div class="bd">
      <div class="fg"><label>Sign out admins after (minutes)<input id="sLock" type="number" min="1" max="120" value="${s.lockMinutes}"></label></div>
      <p style="font-size:.74rem;color:#7a5c44;margin:-4px 0 12px">Admins who are inactive for this long are signed out automatically and must sign in again. Only the super admin can change this.</p>
      <button class="gold" style="max-width:200px" onclick="saveLock()">Save auto-lock</button>
    </div></div>` : ''}
  </div>`;
}
async function saveLock() {
  try {
    const mins = Math.max(1, Number($('sLock').value) || 5);
    await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ lockMinutes: mins }) });
    lockMs = mins * 60000;
    toast('Auto-lock saved');
  } catch (e) { toast(e.message); }
}
async function savePoints() {
  try {
    const v = Number($('sPtsVal').value) || 0;
    const thr = Math.max(1, Number($('sPtsThr').value) || 100);
    await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ pointsValue: v, loyaltyThreshold: thr }) });
    toast('Loyalty settings saved');
  } catch (e) { toast(e.message); }
}
async function changePw() {
  const cur = $('pwCur').value, nw = $('pwNew').value, con = $('pwCon').value;
  if (nw !== con) { $('pwErr').textContent = 'Passwords do not match.'; $('pwErr').style.display = 'block'; return; }
  try {
    await api('/api/admin/change-password', { method: 'POST', body: JSON.stringify({ current: cur, password: nw }) });
    $('pwCur').value = $('pwNew').value = $('pwCon').value = '';
    $('pwErr').style.display = 'none';
    toast('Password updated');
  } catch (e) { $('pwErr').textContent = e.message; $('pwErr').style.display = 'block'; }
}
async function setTgl(k, v) {
  const cur = await api('/api/admin/settings');
  cur.toggles[k] = v;
  await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ toggles: cur.toggles }) });
  toast(v ? 'On' : 'Off');
}
async function saveSettings() {
  try {
    await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({
      name: $('sName').value, tagline: $('sTag').value, email: $('sMail').value, phone: $('sPhone').value,
      address: $('sAddr').value, currency: $('sCur').value, deliveryTime: $('sTime').value,
      deliveryFee: $('sFee').value, freeDelivery: $('sFree').value, deliveryZones: $('sZones').value,
      maxReviewLen: $('sMaxRev').value
    }) });
    toast('Settings saved');
  } catch (e) { toast(e.message); }
}
async function saveSmtp() {
  try {
    await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({
      smtp: {
        host: $('smtpHost').value.trim(),
        port: Number($('smtpPort').value) || 465,
        secure: !!$('smtpSecure').checked,
        user: $('smtpUser').value.trim(),
        pass: $('smtpPass').value,
        from: $('smtpFrom').value.trim()
      }
    }) });
    toast('Email settings saved');
  } catch (e) { toast(e.message); }
}

/* ---------------- Site images ---------------- */
const IMG_DEFAULTS = {
  hero: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1920&q=90&auto=format&fit=crop',
  about: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&q=85&auto=format&fit=crop',
  quote: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1920&q=85&auto=format&fit=crop',
  visit: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=900&q=85&auto=format&fit=crop',
  svc_bg: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&q=80&auto=format&fit=crop',
  svc_coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80&auto=format&fit=crop',
  svc_bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80&auto=format&fit=crop',
  shop_banner: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&q=85&auto=format&fit=crop'
};
async function loadImages() {
  const list = await api('/api/admin/images');
  return `
  <div class="toolbar"><span style="font-size:.82rem;color:#7a5c44">Every picture on the website can be changed here — customers see the new image within seconds. Paste an image URL (https://…) or upload an image from your computer.</span></div>
  <div class="grid2">${list.map(x => `
    <div class="card2"><div class="hd"><b>${esc(x.label)}</b></div><div class="bd">
      <div class="imgprev" id="imgprev_${esc(x.bkey)}" style="background-image:url('${esc(x.url || '')}')"></div>
      <label class="upl site-upload"><input type="file" accept="image/*" onchange="upSiteImg('${esc(x.bkey)}',this)">📁 Upload image from computer</label>
      <div class="fg"><label>Image URL<input id="img_${esc(x.bkey)}" value="${esc(x.url || '')}" placeholder="https://..."></label></div>
      <div class="imgacts">
        <button class="ghost" onclick="resetImg('${esc(x.bkey)}')">Use default</button>
        <button class="gold" onclick="saveImg('${esc(x.bkey)}')">Save</button>
      </div>
    </div></div>`).join('')}
  </div>`;
}
async function upSiteImg(k, input) {
  const f = input.files[0]; if (!f) return;
  if (f.size > 4 * 1024 * 1024) { toast('Image too large — max 4 MB.'); input.value = ''; return; }
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      const MAX = 1200;
      if (Math.max(w, h) > MAX) { const s = MAX / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
      let q = 0.72, url = '';
      // Shrink quality/size until the data URL fits safely in the database (max ~58k chars)
      for (let tries = 0; tries < 8; tries++) {
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        url = cv.toDataURL('image/jpeg', q);
        if (url.length <= 58000) break;
        w = Math.max(200, Math.round(w * 0.7));
        h = Math.max(200, Math.round(h * 0.7));
        q = Math.max(0.4, q - 0.08);
      }
      $('img_' + k).value = url;
      $('imgprev_' + k).style.backgroundImage = "url('" + url + "')";
      toast('Image ready — click Save');
    };
    img.onerror = () => toast('Could not read that image.');
    img.src = rd.result;
  };
  rd.readAsDataURL(f);
  input.value = '';
}
async function saveImg(k) {
  try {
    const url = $('img_' + k).value.trim();
    await api('/api/admin/images', { method: 'PUT', body: JSON.stringify({ bkey: k, url }) });
    $('imgprev_' + k).style.backgroundImage = url ? "url('" + url + "')" : 'none';
    toast('Image saved');
  } catch (e) { toast(e.message); }
}
async function resetImg(k) {
  try {
    const url = IMG_DEFAULTS[k] || '';
    await api('/api/admin/images', { method: 'PUT', body: JSON.stringify({ bkey: k, url }) });
    $('img_' + k).value = url;
    $('imgprev_' + k).style.backgroundImage = url ? "url('" + url + "')" : 'none';
    toast('Reset to default');
  } catch (e) { toast(e.message); }
}

/* ---------------- Notifications ---------------- */
async function loadNotifs() {
  const n = await api('/api/admin/notifications');
  return `
  <div class="toolbar"><button class="a-btn red" onclick="clearNotifs()">Clear all</button></div>
  ${n.map(x => `<div class="notif" style="opacity:${x.is_read ? .6 : 1}"><span class="ic" style="font-size:1rem">🔔</span><div class="n">${esc(x.message)}<div class="d">${dt(x.created_at)}</div></div><button class="a-btn" onclick="readNotif(${x.id},this)">Mark read</button></div>`).join('') || '<div class="card2"><div class="bd" style="color:#888">No notifications.</div></div>'}`;
}
async function readNotif(id, el) { try { await api('/api/admin/notifications/' + id + '/read', { method: 'POST', body: '{}' }); el.closest('.notif').style.opacity = .6; } catch (e) {} }
async function clearNotifs() {
  confirm('Delete all notifications?', async () => { try { await api('/api/admin/notifications', { method: 'DELETE' }); loadNotifs().then(h => $('pan').innerHTML = h); } catch (e) { toast(e.message); } });
}

/* ---------------- Announcements ---------------- */
async function loadAnnouncements() {
  const d = await api('/api/admin/announcements');
  const list = (d.announcements || []).map(a => `
    <div class="card2" style="opacity:${a.status ? 1 : .55}">
      <div class="hd"><b>${esc(a.title || 'Untitled announcement')}</b><span style="font-size:.74rem;color:#7a5c44;font-weight:400">${dt(a.created_at)}</span></div>
      <div class="bd">
        <p style="margin:0 0 14px;white-space:pre-line">${esc(a.message)}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="a-btn" onclick="togAnn(${a.id},${a.status ? 0 : 1},this)">${a.status ? 'Hide from site' : 'Publish'}</button>
          <button class="a-btn red" onclick="delAnn(${a.id})">Delete</button>
        </div>
      </div>
    </div>`).join('');
  return `
  <div class="toolbar"><span style="font-size:.78rem;color:#7a5c44">What you post here appears on every page of the website via the red microphone button.</span></div>
  <div class="card2"><div class="hd"><b>New announcement</b></div><div class="bd">
    <div class="fg"><label>Title</label><input id="annTitle" maxlength="120" placeholder="e.g. New branch in Musanze!"></div>
    <div class="fg"><label>Message</label><textarea id="annMsg" rows="3" maxlength="1000" placeholder="e.g. We are opening a brand new MOOD branch in Musanze this month — free coffee for the first 100 visitors!"></textarea></div>
    <button class="gold" style="max-width:220px" onclick="saveAnn()">Post announcement</button>
  </div></div>
  <div class="kpis"><div class="kpi"><b>${(d.announcements || []).length}</b><span>Total posted</span></div><div class="kpi"><b>${(d.announcements || []).filter(x => x.status).length}</b><span>Live on site</span></div></div>
  ${list || '<div class="card2"><div class="bd" style="color:#888">No announcements yet. Post your first one above — customers will see it immediately.</div></div>'}`;
}
async function saveAnn() {
  const title = $('annTitle').value, msg = $('annMsg').value;
  if (!msg.trim()) { toast('Write the announcement message first.'); return; }
  try {
    await api('/api/admin/announcements', { method: 'POST', body: JSON.stringify({ title, message: msg }) });
    toast('Announcement is now live for all customers');
    loadAnnouncements().then(h => $('pan').innerHTML = h);
  } catch (e) { toast(e.message); }
}
async function togAnn(id, val, el) {
  try {
    await api('/api/admin/announcements/' + id, { method: 'PATCH', body: JSON.stringify({ status: val }) });
    toast(val ? 'Announcement is now live' : 'Hidden from the site');
    loadAnnouncements().then(h => $('pan').innerHTML = h);
  } catch (e) { toast(e.message); }
}
async function delAnn(id) {
  confirm('Delete this announcement? Customers will no longer see it.', async () => {
    try { await api('/api/admin/announcements/' + id, { method: 'DELETE' }); loadAnnouncements().then(h => $('pan').innerHTML = h); } catch (e) { toast(e.message); }
  });
}

/* ---------------- Reports ---------------- */
async function loadReports() {
  const r = await api('/api/admin/reports');
  return `
  <div class="kpis">
    <div class="kpi"><b>${money(r.revenue)}</b><span>Revenue</span></div>
    <div class="kpi"><b>${money(r.discounts)}</b><span>Discounts given</span></div>
    <div class="kpi"><b>${r.orders}</b><span>Orders</span></div>
    <div class="kpi"><b>${money(r.avgOrder)}</b><span>Avg order</span></div>
    <div class="kpi"><b>${r.customers}</b><span>Customers</span></div>
  </div>
  <div class="toolbar">
    <button class="a-btn" onclick="location='/api/admin/export/orders'">Export orders CSV</button>
    <button class="a-btn" onclick="location='/api/admin/export/customers'">Export customers CSV</button>
    <button class="a-btn" onclick="location='/api/admin/export/products'">Export products CSV</button>
  </div>
  <div class="grid2">
    <div class="card2"><div class="hd"><b>Top products</b></div><div class="bd">${r.topProducts.map((p, i) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0ece8;font-size:.84rem"><span>${i + 1}. ${esc(p.name)}</span><b style="color:#c8956c">${p.n} sold</b></div>`).join('') || '<p style="color:#888">No sales yet.</p>'}</div></div>
    <div class="card2"><div class="hd"><b>Category sales</b></div><div class="bd">${r.categorySales.map(c => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0ece8;font-size:.84rem"><span>${esc(c.name)}</span><b style="color:#c8956c">${c.n} items</b></div>`).join('') || '<p style="color:#888">No sales yet.</p>'}</div></div>
  </div>
  <div class="card2"><div class="hd"><b>Payment methods</b></div><div class="bd"><div class="chips">${r.payments.map(p => `<span class="chip"><b>${esc(p.payment)}</b>${p.n} orders</span>`).join('') || '<p style="color:#888">No orders yet.</p>'}</div></div></div>`;
}

/* ---------------- Reviews ---------------- */
async function loadReviews() {
  const r = await api('/api/admin/reviews');
  return `
  <div class="toolbar"><span style="font-size:.82rem;color:#7a5c44">Customer reviews appear on the menu automatically. Hide or delete any that break your rules.</span></div>
  <div class="card2"><div class="bd" style="padding:0">
    <table><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Comment</th><th>Status</th><th>When</th><th></th></tr>
    ${r.map(x => `<tr>
      <td><b>${esc(x.product)}</b></td>
      <td>${esc(x.customer_name)}</td>
      <td style="color:var(--gold);letter-spacing:2px">${'★'.repeat(x.rating)}${'☆'.repeat(5 - x.rating)}</td>
      <td style="max-width:300px;font-size:.78rem">${esc(x.comment) || '<span style="color:#999">—</span>'}</td>
      <td><span class="bdg ${x.status ? 'on' : 'off'}" style="cursor:pointer" onclick="togRev(${x.id},${x.status ? 0 : 1},this)">${x.status ? 'Shown' : 'Hidden'}</span></td>
      <td style="font-size:.74rem">${dt(x.created_at)}</td>
      <td><button class="a-btn red" onclick="delRev(${x.id})">Delete</button></td>
    </tr>`).join('') || '<tr><td colspan="7" style="color:#888;text-align:center;padding:30px">No reviews yet.</td></tr>'}
    </table></div></div>`;
}
async function togRev(id, val, el) {
  try { await api('/api/admin/reviews/' + id, { method: 'PATCH', body: JSON.stringify({ status: val }) }); el.className = 'bdg ' + (val ? 'on' : 'off'); el.textContent = val ? 'Shown' : 'Hidden'; toast('Saved'); }
  catch (e) { toast(e.message); }
}
function delRev(id) {
  confirm('Delete this review?', async () => {
    try { await api('/api/admin/reviews/' + id, { method: 'DELETE' }); loadReviews().then(h => $('pan').innerHTML = h); toast('Deleted'); }
    catch (e) { toast(e.message); }
  });
}

/* ---------------- Reservations ---------------- */
async function loadReservations() {
  const r = await api('/api/admin/reservations');
  return `
  <div class="toolbar"><span style="font-size:.82rem;color:#7a5c44">Table bookings made from the website.</span></div>
  <div class="card2"><div class="bd" style="padding:0">
    <table><tr><th>When</th><th>Name</th><th>Phone</th><th>Guests</th><th>Notes</th><th>Status</th><th></th></tr>
    ${r.map(x => `<tr>
      <td><b>${esc(String(x.res_date).slice(0, 10))}</b><br><small style="color:#7a5c44">${esc(x.res_time || '')}</small></td>
      <td>${esc(x.name)}</td><td>${esc(x.phone)}</td><td>${x.guests}</td>
      <td style="max-width:220px;font-size:.76rem">${esc(x.notes) || '<span style="color:#999">—</span>'}</td>
      <td><select style="width:130px;margin:0" onchange="setRes(${x.id},this.value)">${['Pending','Confirmed','Done','Cancelled'].map(s => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td><button class="a-btn red" onclick="delRes(${x.id})">Delete</button></td>
    </tr>`).join('') || '<tr><td colspan="7" style="color:#888;text-align:center;padding:30px">No reservations yet.</td></tr>'}
    </table></div></div>`;
}
async function setRes(id, st) {
  try { await api('/api/admin/reservations/' + id, { method: 'PUT', body: JSON.stringify({ status: st }) }); toast('Saved'); }
  catch (e) { toast(e.message); }
}
function delRes(id) {
  confirm('Delete this reservation?', async () => {
    try { await api('/api/admin/reservations/' + id, { method: 'DELETE' }); loadReservations().then(h => $('pan').innerHTML = h); toast('Deleted'); }
    catch (e) { toast(e.message); }
  });
}

/* ---------------- Gift Cards ---------------- */
async function loadGiftcards() {
  const g = await api('/api/admin/giftcards');
  return `
  <div class="toolbar"><button class="a-btn" onclick="openGc()">+ Create gift card</button></div>
  <div class="card2"><div class="bd" style="padding:0">
    <table><tr><th>Code</th><th>Buyer</th><th>Value</th><th>Balance</th><th>Status</th><th>Created</th><th></th></tr>
    ${g.map(x => `<tr>
      <td><b>${esc(x.code)}</b></td>
      <td>${esc(x.buyer_name)}<br><small style="color:#7a5c44">${esc(x.buyer_email || '')}</small></td>
      <td>${money(x.amount)}</td><td>${money(x.balance)}</td>
      <td><span class="bdg ${x.status ? 'on' : 'off'}" style="cursor:pointer" onclick="togGc(${x.id},${x.status ? 0 : 1},this)">${x.status ? 'Active' : 'Disabled'}</span></td>
      <td style="font-size:.74rem">${dt(x.created_at)}</td>
      <td><button class="a-btn red" onclick="delGc(${x.id})">Delete</button></td>
    </tr>`).join('') || '<tr><td colspan="7" style="color:#888;text-align:center;padding:30px">No gift cards yet.</td></tr>'}
    </table></div></div>`;
}
function openGc() {
  $('gcErr').style.display = 'none';
  $('gcName').value = ''; $('gcMail').value = ''; $('gcAmt').value = '20';
  openModal('gcModal');
}
async function saveGc() {
  try {
    await api('/api/admin/giftcards', { method: 'POST', body: JSON.stringify({
      amount: $('gcAmt').value, buyerName: $('gcName').value, buyerEmail: $('gcMail').value
    }) });
    closeModal('gcModal'); loadGiftcards().then(h => $('pan').innerHTML = h); toast('Gift card created');
  } catch (e) { $('gcErr').textContent = e.message; $('gcErr').style.display = 'block'; }
}
async function togGc(id, val, el) {
  try { await api('/api/admin/giftcards/' + id, { method: 'PATCH', body: JSON.stringify({ status: val }) }); el.className = 'bdg ' + (val ? 'on' : 'off'); el.textContent = val ? 'Active' : 'Disabled'; toast('Saved'); }
  catch (e) { toast(e.message); }
}
function delGc(id) {
  confirm('Delete this gift card?', async () => {
    try { await api('/api/admin/giftcards/' + id, { method: 'DELETE' }); loadGiftcards().then(h => $('pan').innerHTML = h); toast('Deleted'); }
    catch (e) { toast(e.message); }
  });
}

/* ---------------- Withdrawals (Paypack cashout) ---------------- */
async function loadPayouts() {
  const p = await api('/api/admin/payouts');
  return `
  <div class="toolbar"><span style="font-size:.82rem;color:#7a5c44">Withdraw money from your Paypack wallet to a mobile money number (MTN MoMo / Airtel Money / Tigo Cash).</span></div>
  <div class="grid2">
    <div class="card2"><div class="hd"><b>Withdraw to mobile money</b></div><div class="bd">
      <div class="fg"><label>Amount (RWF) *<input id="coAmt" type="number" min="100" step="50" placeholder="e.g. 5000"></label></div>
      <div class="fg"><label>Mobile money number *<input id="coPhone" placeholder="e.g. 0788123456"></label></div>
      <button class="gold" style="max-width:240px" onclick="doPayout()">Withdraw</button>
    </div></div>
    <div class="card2"><div class="hd"><b>History</b></div><div class="bd" style="padding:0">
      <table><tr><th>Ref</th><th>Number</th><th>Amount</th><th>Status</th><th>When</th><th></th></tr>
      ${p.map(x => `<tr>
        <td><b>${esc(x.ref || '—')}</b></td>
        <td>${esc(x.phone || '—')}</td>
        <td>${money(x.amount)}</td>
        <td><span class="bdg ${x.status === 'successful' ? 'on' : (x.status === 'failed' ? 'off' : '')}">${esc(x.status || x.event)}</span></td>
        <td style="font-size:.74rem">${dt(x.created_at)}</td>
        <td><button class="a-btn" onclick="checkPayout('${esc(x.ref || '')}',this)">Refresh</button></td>
      </tr>`).join('') || '<tr><td colspan="6" style="color:#888;text-align:center;padding:30px">No withdrawals yet.</td></tr>'}
      </table></div></div>
  </div>`;
}
function doPayout() {
  const amt = Number($('coAmt').value);
  const phone = $('coPhone').value.trim();
  if (!amt || amt < 100) { toast('Enter an amount of at least 100 RWF.'); return; }
  if (!phone) { toast('Enter the mobile money number to receive the money.'); return; }
  confirm(`Withdraw ${money(amt)} to ${phone}? This sends real money from your Paypack wallet.`, async () => {
    try {
      const r = await api('/api/admin/payouts', { method: 'POST', body: JSON.stringify({ amount: amt, phone }) });
      toast('Withdrawal request sent (ref ' + r.ref + ')');
      loadPayouts().then(h => $('pan').innerHTML = h);
    } catch (e) { toast(e.message); }
  });
}
async function checkPayout(ref, el) {
  if (!ref) { toast('No Paypack reference yet.'); return; }
  try {
    const r = await api('/api/admin/payouts/' + encodeURIComponent(ref));
    if (el) {
      const b = el.closest('tr').querySelector('.bdg');
      if (b) { b.className = 'bdg ' + (r.status === 'successful' ? 'on' : (r.status === 'failed' ? 'off' : '')); b.textContent = r.status; }
    }
    toast('Status: ' + r.status);
  } catch (e) { toast(e.message); }
}

/* ---------------- Money control panel (wallet + Paypack live) ---------------- */
let moneyTabActive = 'overview';
const METHOD_LBL = { mtn: 'MTN MoMo', airtel: 'Airtel Money', tigo: 'Tigo Cash', card: 'Card', cash: 'Cash', paypal: 'PayPal', bank: 'Bank', paypack: 'Paypack', manual: 'Manual' };

async function loadMoney() {
  return `
  <div class="toolbar" style="flex-wrap:wrap;gap:8px">
    <button class="a-btn ${moneyTabActive === 'overview' ? 'gold' : ''}" onclick="moneyTab('overview')">Overview</button>
    <button class="a-btn ${moneyTabActive === 'record' ? 'gold' : ''}" onclick="moneyTab('record')">Record money in / out</button>
    <button class="a-btn ${moneyTabActive === 'ledger' ? 'gold' : ''}" onclick="moneyTab('ledger')">Ledger</button>
    <button class="a-btn ${moneyTabActive === 'paypack' ? 'gold' : ''}" onclick="moneyTab('paypack')">Paypack live</button>
  </div>
  <div id="moneyBody">${moneyTabActive === 'overview' ? '<div class="card2"><div class="bd" style="color:#999">Loading…</div></div>' : ''}</div>`;
}

function moneyTab(t) {
  moneyTabActive = t;
  loadMoney().then(h => $('pan').innerHTML = h);
  moneyLoadTab();
}
async function moneyLoadTab() {
  const b = $('moneyBody');
  if (!b) return;
  if (moneyTabActive === 'record') { b.innerHTML = moneyRecordHtml(); return; }
  if (moneyTabActive === 'paypack') { moneyPaypackHtml().then(h => b.innerHTML = h); return; }
  const d = await api('/api/admin/wallet');
  if (moneyTabActive === 'overview') b.innerHTML = moneyOverviewHtml(d);
  else b.innerHTML = moneyLedgerHtml(d);
}

function moneyOverviewHtml(d) {
  return `
  <div class="kpis">
    <div class="kpi" style="background:linear-gradient(135deg,#2e7d32,#1b5e20);color:#fff"><b>${money(d.balance)}</b><span>Wallet balance</span></div>
    <div class="kpi"><b>${money(d.moneyIn)}</b><span>Money in</span></div>
    <div class="kpi"><b style="color:#c0392b">${money(d.moneyOut)}</b><span>Money out</span></div>
    <div class="kpi"><b>${d.nIn + d.nOut}</b><span>Ledger entries</span></div>
  </div>
  <div class="grid2">
    <div class="card2"><div class="hd"><b>Money in — by method</b></div><div class="bd">
      ${d.byIn.length ? d.byIn.map(m => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0ece8;font-size:.84rem"><span>${esc(m.label)} <small style="color:#7a5c44">(${m.count})</small></span><b style="color:#2e7d32">${money(m.amount)}</b></div>`).join('') : '<p style="color:#888">No money-in recorded yet.</p>'}
    </div></div>
    <div class="card2"><div class="hd"><b>Money out — by method</b></div><div class="bd">
      ${d.byOut.length ? d.byOut.map(m => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0ece8;font-size:.84rem"><span>${esc(m.label)} <small style="color:#7a5c44">(${m.count})</small></span><b style="color:#c0392b">${money(m.amount)}</b></div>`).join('') : '<p style="color:#888">No money-out recorded yet.</p>'}
    </div></div>
  </div>
  <div class="card2"><div class="bd" style="font-size:.78rem;color:#7a5c44">Paid orders are added automatically as money-in; Paypack cashouts are added automatically as money-out. Use "Record money in / out" for counter cash, expenses and anything else. The balance is money-in minus money-out.</div></div>`;
}

function moneyRecordHtml() {
  return `
  <div class="grid2">
    <div class="card2" style="border-color:#2e7d32"><div class="hd"><b style="color:#2e7d32">↓ Money in (received)</b></div><div class="bd">
      <div class="fg"><label>Method *</label><select id="wiM">
        <option value="mtn">MTN MoMo</option><option value="airtel">Airtel Money</option>
        <option value="tigo">Tigo Cash</option><option value="card">Card (Flutterwave)</option>
        <option value="cash" selected>Cash on delivery / counter</option><option value="paypal">PayPal</option>
      </select></div>
      <div class="fg"><label>Amount *</label><input id="wiAmt" type="number" min="0" step="0.01" placeholder="e.g. 5000"></div>
      <div class="fg"><label>Note</label><input id="wiNote" placeholder="e.g. Counter sale, delivery payment…"></div>
      <div class="fg"><label>Reference (optional)</label><input id="wiRef" placeholder="e.g. MD-…, invoice no."></div>
      <button class="gold" style="max-width:240px" onclick="recordMoney('in')">Record money in</button>
    </div></div>
    <div class="card2" style="border-color:#c0392b"><div class="hd"><b style="color:#c0392b">↑ Money out (spent)</b></div><div class="bd">
      <div class="fg"><label>Method *</label><select id="woM">
        <option value="cash" selected>Cash</option><option value="airtel">Airtel Money</option>
        <option value="mtn">MTN MoMo</option><option value="card">Card</option><option value="bank">Bank</option>
        <option value="paypack">Paypack (wallet cashout)</option><option value="manual">Manual / other</option>
      </select></div>
      <div class="fg"><label>Amount *</label><input id="woAmt" type="number" min="0" step="0.01" placeholder="e.g. 5000"></div>
      <div class="fg"><label>Note</label><input id="woNote" placeholder="e.g. Supplier, refund, fuel…"></div>
      <div class="fg"><label>Reference (optional)</label><input id="woRef" placeholder="e.g. invoice no."></div>
      <button class="gold" style="max-width:240px;background:#c0392b" onclick="recordMoney('out')">Record money out</button>
      <p style="font-size:.74rem;color:#7a5c44;margin:8px 0 0">For a real Paypack cashout (money leaving your Paypack wallet to mobile money) use the Withdrawals tab instead — it is recorded here automatically.</p>
    </div></div>
  </div>`;
}

function moneyLedgerHtml(d) {
  const st = s => '<span class="bdg ' + (s === 'successful' ? 'on' : (s === 'failed' ? 'off' : '')) + '">' + esc(s || '—') + '</span>';
  return `
  <div class="toolbar">
    <span style="font-size:.82rem;color:#7a5c44">Every money movement, newest first.</span>
    <button class="a-btn" onclick="location='/api/admin/wallet/export'">⬇ Export CSV</button>
  </div>
  <div class="card2"><div class="bd" style="padding:0">
    <table><tr><th>When</th><th>Type</th><th>Method</th><th>Amount</th><th>Note</th><th>Ref</th><th>Status</th><th>By</th><th></th></tr>
    ${d.list.map(w => `<tr>
      <td style="font-size:.74rem">${dt(w.created_at)}</td>
      <td><span class="bdg ${w.type === 'in' ? 'on' : 'off'}">${w.type === 'in' ? 'In' : 'Out'}</span></td>
      <td>${esc(w.methodLabel || w.method)}</td>
      <td><b style="color:${w.type === 'in' ? '#2e7d32' : '#c0392b'}">${w.type === 'in' ? '+' : '−'}${money(w.amount)}</b></td>
      <td style="max-width:240px;font-size:.78rem">${esc(w.note) || '—'}</td>
      <td style="font-size:.74rem">${esc(w.ref || '—')}</td>
      <td>${st(w.status)}</td>
      <td style="font-size:.74rem">${esc(w.recordedBy || 'auto')}</td>
      <td>${w.createdBy && w.createdBy === admin.id ? `<button class="a-btn red" onclick="delWallet(${w.id})">✕</button>` : ''}</td>
    </tr>`).join('') || '<tr><td colspan="9" style="color:#888;text-align:center;padding:30px">No ledger entries yet. Record money in/out or take a payment to get started.</td></tr>'}
    </table></div></div>`;
}

async function recordMoney(dir) {
  const isIn = dir === 'in';
  const m = $(isIn ? 'wiM' : 'woM').value;
  const amt = Number($(isIn ? 'wiAmt' : 'woAmt').value);
  const note = $(isIn ? 'wiNote' : 'woNote').value;
  const ref = $(isIn ? 'wiRef' : 'woRef').value;
  if (!amt || amt <= 0) { toast('Enter a valid amount.'); return; }
  confirm(`${isIn ? 'Record' : 'Record'} ${money(amt)} money-${isIn ? 'in' : 'out'} (${esc(METHOD_LBL[m] || m)})?`, async () => {
    try {
      await api('/api/admin/wallet/' + (isIn ? 'in' : 'out'), { method: 'POST', body: JSON.stringify({ method: m, amount: amt, note, ref }) });
      toast('Recorded');
      moneyTab('overview');
    } catch (e) { toast(e.message); }
  });
}
function delWallet(id) {
  confirm('Delete this ledger entry? (only entries you recorded)', async () => {
    try {
      await api('/api/admin/wallet/' + id, { method: 'DELETE' });
      toast('Deleted');
      moneyTab('ledger');
    } catch (e) { toast(e.message); }
  });
}

async function moneyPaypackHtml() {
  const r = await api('/api/admin/paypack?limit=100');
  const list = r.list || [];
  const st = s => '<span class="bdg ' + (s === 'successful' ? 'on' : (s === 'failed' ? 'off' : '')) + '">' + esc(s || '—') + '</span>';
  return `
  <div class="grid2">
    <div class="card2"><div class="hd"><b>Received (successful money-in)</b></div><div class="bd" style="font-size:1.5rem;color:#2e7d32">${money(r.received)}</div></div>
    <div class="card2"><div class="hd"><b>Sent (successful money-out)</b></div><div class="bd" style="font-size:1.5rem;color:#c0392b">${money(r.sent)}</div></div>
  </div>
  <div class="card2"><div class="hd"><b>All transactions (live from Paypack)</b></div><div class="bd" style="padding:0">
    <table><tr><th>Ref</th><th>Type</th><th>Number</th><th>Amount</th><th>Provider</th><th>Status</th><th>Created</th></tr>
    ${list.map(t => `<tr>
      <td><b>${esc(t.ref || '—')}</b></td>
      <td>${t.kind === 'CASHIN' ? 'Money in' : (t.kind === 'CASHOUT' ? 'Money out' : esc(t.kind || '—'))}</td>
      <td>${esc(t.client || '—')}</td>
      <td>${money(t.amount)}</td>
      <td>${esc(String(t.provider || '—').toUpperCase())}</td>
      <td>${st(t.status)}</td>
      <td style="font-size:.74rem">${dt(t.created_at)}</td>
    </tr>`).join('') || '<tr><td colspan="7" style="color:#888;text-align:center;padding:30px">No transactions yet.</td></tr>'}
    </table></div></div>`;
}

/* ---------------- AI Assistant (admin) ---------------- */
let aiMsgs = [];
const AI_SUGGEST = ['Who is the latest customer?', 'How much did we earn today?', 'What new orders do we have?', 'What are our best sellers?', 'Give me insights'];

async function loadAi() {
  if (!aiMsgs.length) aiMsgs = [{ from: 'ai', text: '👋 Hi ' + (admin ? admin.name : '') + '! Ask me anything about your shop — the latest customer, today\'s earnings, new orders, best sellers, insights and more.' }];
  let llmBadge = 'built-in intents';
  try { const s = await api('/api/admin/llm'); if (s.configured) llmBadge = s.provider + ' · ' + s.model; } catch (e) {}
  return `
  <div class="ai">
    <div class="ai-hd">
      <div class="ai-brand">
        <div class="ai-ava"><span>☕</span></div>
        <div><b>MOOD Assistant</b><span class="ai-on">● Online · answers from your live data · <em style="font-style:normal;color:#8a6a4e">${esc(llmBadge)}</em></span></div>
      </div>
      <button class="a-btn" onclick="aiReset()">+ New chat</button>
    </div>
    <div class="ai-msgs" id="aiMsgs">${aiMsgs.map(aiBubble).join('')}</div>
    <div class="ai-sugs" id="aiSugs">${AI_SUGGEST.map(s => `<button class="chip" onclick="aiSend('${s.replace(/'/g, "\\'")}',true)">${esc(s)}</button>`).join('')}</div>
    <div class="ai-in">
      <input id="aiIn" placeholder="Ask about orders, customers, money…" onkeydown="if(event.key==='Enter')aiSend()">
      <button class="ai-send" onclick="aiSend()" aria-label="Send">➤</button>
    </div>
  </div>`;
}
function aiBubble(m) {
  if (m.typing) return `<div class="ai-msg ai-bot"><div class="ai-ava"><span>☕</span></div><div class="ai-txt typing"><i></i><i></i><i></i></div></div>`;
  if (m.from === 'me') return `<div class="ai-msg ai-me"><div class="ai-txt">${esc(m.text).replace(/\n/g, '<br>')}</div></div>`;
  return `<div class="ai-msg ai-bot"><div class="ai-ava"><span>☕</span></div><div class="ai-txt">${esc(m.text).replace(/\n/g, '<br>')}</div></div>`;
}
function aiReset() {
  aiMsgs = [];
  switchPanel('ai');
}
async function aiSend(suggested, isSug) {
  const inp = $('aiIn');
  const txt = isSug ? suggested : (inp ? inp.value.trim() : '');
  if (!txt) return;
  aiMsgs.push({ from: 'me', text: txt });
  aiMsgs.push({ from: 'ai', typing: true });
  if (inp) inp.value = '';
  renderAi();
  try {
    const r = await api('/api/admin/ai/chat', { method: 'POST', body: JSON.stringify({ message: txt }) });
    aiMsgs[aiMsgs.length - 1] = { from: 'ai', text: r.answer };
  } catch (e) {
    aiMsgs[aiMsgs.length - 1] = { from: 'ai', text: '⚠️ ' + e.message };
  }
  renderAi();
}
function renderAi() {
  const b = $('aiMsgs');
  if (b) { b.innerHTML = aiMsgs.map(aiBubble).join(''); b.scrollTop = b.scrollHeight; }
}

/* ---------------- Team & Admins (super admin only) ---------------- */
async function loadAdmins() {
  const a = await api('/api/admin/admins');
  return `
  <div class="toolbar"><button class="a-btn" onclick="openAdmin()">+ Add admin</button></div>
  <div class="card2"><div class="bd" style="padding:0">
    <table><tr><th>Admin</th><th>Role</th><th>Permissions</th><th>Status</th><th>Last login</th><th></th></tr>
    ${a.map(adm => {
      const isMe = adm.id === admin.id;
      return `<tr>
        <td><b>${esc(adm.name)}</b>${isMe ? ' <small style="color:#c8956c">(you)</small>' : ''}<br><small style="color:#7a5c44">${esc(adm.email)}</small></td>
        <td><span class="role-badge ${adm.role === 'superadmin' ? 'super' : 'staff'}">${adm.role === 'superadmin' ? 'Super Admin' : 'Staff'}</span></td>
        <td style="max-width:260px">${adm.role === 'superadmin' ? '<span class="chip">All permissions</span>' : (adm.perms.length ? adm.perms.map(p => `<span class="chip">${esc(permLabel(p))}</span>`).join('') : '<span style="color:#888">None</span>')}</td>
        <td><span class="bdg ${adm.status ? 'on' : 'off'}">${adm.status ? 'Active' : 'Disabled'}</span></td>
        <td style="font-size:.76rem">${adm.last_login ? dt(adm.last_login) : '—'}</td>
        <td>
          <button class="a-btn" onclick="openAdmin(${adm.id})">Edit</button>
          ${isMe ? '' : `<button class="a-btn" onclick="toggleAdmin(${adm.id},${adm.status ? 0 : 1},'${esc(adm.name)}')">${adm.status ? 'Disable' : 'Enable'}</button>`}
          ${isMe ? '' : `<button class="a-btn red" onclick="delAdmin(${adm.id},'${esc(adm.name)}')">Delete</button>`}
        </td>
      </tr>`;
    }).join('')}
    </table></div></div>`;
}
async function openAdmin(id) {
  $('admErr').style.display = 'none';
  let a = null;
  if (id) { const list = await api('/api/admin/admins'); a = list.find(x => x.id === id); }
  $('admTitle').textContent = id ? 'Edit Admin' : 'Add Admin';
  $('admId').value = id || '';
  $('admName').value = a ? a.name : '';
  $('admMail').value = a ? a.email : '';
  $('admPass').value = '';
  $('admPass').placeholder = id ? 'Leave blank to keep current password' : 'Min 6 characters';
  $('admRole').value = a ? a.role : 'staff';
  $('admStat').checked = a ? !!a.status : true;
  $('admPerms').innerHTML = ALL_PERMS.map(([k, l]) =>
    `<label class="perm"><input type="checkbox" value="${k}" ${(!a || a.role === 'superadmin' || (a.perms || []).includes(k)) ? 'checked' : ''}> ${esc(l)}</label>`).join('');
  admRoleChg();
  openModal('admModal');
}
function admRoleChg() {
  const sup = $('admRole').value === 'superadmin';
  $('admPerms').style.opacity = sup ? .5 : 1;
  $('admPerms').querySelectorAll('input').forEach(i => i.disabled = sup);
}
async function saveAdmin() {
  const perms = [...$('admPerms').querySelectorAll('input:checked')].map(i => i.value);
  const body = {
    name: $('admName').value, email: $('admMail').value,
    role: $('admRole').value, perms, status: $('admStat').checked,
    password: $('admPass').value
  };
  try {
    if ($('admId').value) await api('/api/admin/admins/' + $('admId').value, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/admins', { method: 'POST', body: JSON.stringify(body) });
    closeModal('admModal'); loadAdmins().then(h => $('pan').innerHTML = h); toast('Saved');
  } catch (e) { $('admErr').textContent = e.message; $('admErr').style.display = 'block'; }
}
function toggleAdmin(id, status, name) {
  confirm(status ? `Enable "${name}"?` : `Disable "${name}"? They will be signed out immediately.`, async () => {
    try {
      await api('/api/admin/admins/' + id, { method: 'PUT', body: JSON.stringify({ status }) });
      loadAdmins().then(h => $('pan').innerHTML = h); toast('Updated');
    } catch (e) { toast(e.message); }
  });
}
function delAdmin(id, name) {
  confirm(`Delete admin "${name}"? Their account and sessions will be removed.`, async () => {
    try { await api('/api/admin/admins/' + id, { method: 'DELETE' }); loadAdmins().then(h => $('pan').innerHTML = h); toast('Deleted'); }
    catch (e) { toast(e.message); }
  });
}

/* ---------------- Global search ---------------- */
function gSearch(v) {
  v = (v || '').trim();
  if (!v) return;
  switchPanel('orders');
  setTimeout(() => { if ($('oSearch')) { $('oSearch').value = v; fo(); } }, 50);
}

/* ---------------- Modal helpers ---------------- */
document.addEventListener('click', e => {
  if (e.target.classList && e.target.classList.contains('ovl')) {
    ['prodOvl', 'catOvl', 'cfOvl', 'admOvl', 'gcOvl'].forEach(o => $('' + o).classList.remove('open'));
    ['prodModal', 'catModal', 'cfModal', 'admModal', 'gcModal'].forEach(m => $('' + m).classList.remove('open'));
  }
});

boot();
