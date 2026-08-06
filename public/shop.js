/* MOOD Coffee Shop & Bakery — storefront */
const $ = s => document.querySelector(s);
const money = n => { const c = (S.settings && S.settings.currency) || 'USD'; return (c === 'RWF' ? 'RWF ' : '$') + Number(n || 0).toFixed(c === 'RWF' ? 0 : 2); };
const S = { cart: JSON.parse(localStorage.getItem('mood_cart') || '[]'), user: null, settings: {}, products: [], categories: [], cat: 'All', pay: 'paypal', promo: null, service: null, points: 0, gift: null };

const PAY = {
  paypal: { name: 'PayPal', tag: 'Secure checkout', bg: '#003087' },
  mtn: { name: 'MTN MoMo', tag: 'Rwanda & East Africa', bg: '#FFCC00', fg: '#000' },
  airtel: { name: 'Airtel Money', tag: 'Fast mobile payment', bg: '#E40000', fg: '#fff' },
  card: { name: 'Bank Card', tag: 'Visa / Mastercard', bg: '#1A1F71', fg: '#fff' }
};

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600); }
const T = k => I18N.t(k);
function applyLang() {
  document.title = T('shop_title');
  I18N.apply();
  if (S.user) renderNav();
  if (document.getElementById('menuView').style.display !== 'none') renderMenu();
  if (document.getElementById('checkoutView').style.display !== 'none') renderCheckout();
  if (document.getElementById('ordersView').style.display !== 'block') renderOrders();
  if (document.getElementById('cartBox').classList.contains('open')) renderCart();
}
document.addEventListener('i18n:changed', applyLang);
function saveCart() { localStorage.setItem('mood_cart', JSON.stringify(S.cart)); }
function cartCount() { return S.cart.reduce((a, i) => a + i.qty, 0); }

async function api(url, opt) {
  const r = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opt));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed.');
  return j;
}

async function init() {
  const qp = new URLSearchParams(location.search);
  const paidRef = qp.get('paid'), payFail = qp.get('payfail');
  try {
    const d = await api('/api/init');
    S.settings = d.settings; S.categories = d.categories; S.products = d.products; S.user = d.me;
    if (S.settings.toggles.maint) { showMaintenance(); return; }
    I18N.setAvailableFromToggles(S.settings.toggles);
    renderSettings(); applyImages(d.images);
  } catch (e) { toast('Could not reach server.'); }
  renderNav(); renderCats(); renderMenu();
  if (paidRef) {
    S.cart = []; saveCart(); $('#cartCount').textContent = 0; S.gift = null; S.points = 0;
    $('#okMsg').innerHTML = T('shop_thanks') + ' <b style="color:var(--gold)">' + paidRef + '</b><br>' + T('shop_paid_confirm');
    go('success');
  } else if (payFail) {
    toast(T('shop_pay_cancelled'));
  } else {
    openService();
  }
  history.replaceState(null, '', location.pathname);
  setInterval(refreshCatalog, 20000);
  setInterval(refreshOrders, 12000);
}

function applyImages(im) {
  if (!im) return;
  const pick = $('#serviceBox');
  if (im.svc_bg) {
    pick.style.backgroundImage = "linear-gradient(rgba(44,18,0,.5),rgba(20,9,1,.72)),url('" + im.svc_bg + "')";
    pick.style.backgroundSize = 'cover';
    pick.style.backgroundPosition = 'center';
  }
  const cof = document.querySelector('.svc-opt[data-svc="coffee"] .so-img');
  const bak = document.querySelector('.svc-opt[data-svc="bakery"] .so-img');
  if (im.svc_coffee && cof) cof.style.backgroundImage = "url('" + im.svc_coffee + "')";
  if (im.svc_bakery && bak) bak.style.backgroundImage = "url('" + im.svc_bakery + "')";
  const banner = document.querySelector('.banner .bb');
  if (im.shop_banner && banner) banner.style.backgroundImage = "url('" + im.shop_banner + "')";
}

// ─── Live sync: admin changes reach the customer automatically ───
async function refreshCatalog() {
  try {
    const d = await api('/api/init');
    if (d.settings.toggles.maint) { showMaintenance(); return; }
    S.settings = d.settings; S.categories = d.categories; S.products = d.products;
    if (!S.user && d.me) S.user = d.me;
    I18N.setAvailableFromToggles(S.settings.toggles);
    renderSettings(); applyImages(d.images); renderNav(); renderCats();
    if (document.getElementById('menuView').style.display !== 'none') renderMenu();
    if (document.getElementById('cartBox').classList.contains('open')) renderCart();
  } catch (e) {}
}
async function refreshOrders() {
  if (!S.user) return;
  if (document.getElementById('ordersView').style.display !== 'block') return;
  try {
    const d = await api('/api/my-orders');
    renderOrdersFrom(d.orders);
  } catch (e) {}
}

function renderSettings() {
  const s = S.settings;
  document.title = T('shop_title');
  if (s.name) $('#svcName').textContent = s.name;
  if (s.tagline) $('#logoTag').textContent = s.tagline;
  if (s.name) $('#fName').textContent = s.name;
  if (s.tagline) $('#fTag').textContent = s.tagline;
  if (s.address) $('#fAddr').textContent = s.address;
  if (s.phone) $('#fPhone').textContent = s.phone;
  if (s.deliveryTime) $('#fTime').textContent = 'Delivery: ' + s.deliveryTime;
  $('#fYear').textContent = new Date().getFullYear();
  const wa = $('#waBtn');
  if (wa && WA_LINK !== '#') wa.href = WA_LINK;
  document.querySelectorAll('[data-social]').forEach(a => {
    const u = (window.SOCIAL_URL || (k => (window.SOCIAL || {})[k] || ''))(a.dataset.social);
    if (u) a.href = u;
  });
}
(function wireSocials() {
  document.querySelectorAll('[data-social]').forEach(a => {
    const u = (window.SOCIAL_URL || (k => (window.SOCIAL || {})[k] || ''))(a.dataset.social);
    if (u) a.href = u;
  });
})();

function showMaintenance() { location.href = '/maintenance.html'; }

function renderNav() {
  const a = $('#authBtns');
  if (S.user) a.innerHTML = '<button class="nl" onclick="openAcc()" title="' + T('nav_account') + '">' + S.user.name.split(' ')[0] +
    '</button><button class="nl" onclick="logout()">' + T('nav_logout') + '</button>';
  else a.innerHTML = '<button class="nl" onclick="auth(\'login\')">' + T('nav_login') + '</button>' +
    (S.settings.toggles.reg !== false ? '<button class="nl" onclick="auth(\'signup\')">' + T('nav_signup') + '</button>' : '');
  $('#cartCount').textContent = cartCount();
}

function go(v) {
  ['menu', 'checkout', 'orders', 'success'].forEach(x => $('#' + x + 'View').style.display = x === v ? 'block' : 'none');
  if (v === 'menu') {
    if (!S.service) openService();
    renderMenu();
  }
  if (v === 'orders') renderOrders();
  if (v === 'checkout') renderCheckout();
  scrollTo(0, 0);
}

// ─── Service picker: Coffee vs Bakery ───
function serviceCats() { return S.categories.filter(c => c.service === S.service); }
function serviceName() { return S.service === 'bakery' ? 'Bakery' : 'Coffee'; }
function openService() {
  if (S.service) renderServiceChip();
  $('#serviceOvl').classList.add('open'); $('#serviceBox').classList.add('open');
}
function chooseService(s) {
  S.service = s; S.cat = 'All';
  $('#serviceOvl').classList.remove('open'); $('#serviceBox').classList.remove('open');
  renderServiceChip(); renderCats(); renderMenu();
}

// ─── Menu ───
function renderServiceChip() {
  if (!S.service) { $('#svcChip').style.display = 'none'; return; }
  $('#svcChip').style.display = 'flex';
  $('#svcChip').innerHTML = '<span>' + (S.service === 'bakery' ? '🥐' : '☕') + ' ' + (S.service === 'bakery' ? T('svc_bakery_title') : T('svc_coffee_title')) + '</span><b onclick="openService()">' + T('svc_switch') + '</b>';
}
function renderCats() {
  const cats = S.service ? serviceCats() : [];
  $('#catTabs').innerHTML = (S.service ? ['All'].concat(cats.map(c => c.name)) : [T('shop_choose_service')]).map(c =>
    '<button class="ctab' + (S.cat === c ? ' active' : '') + '"' + (S.service ? ' onclick="pickCat(\'' + c + '\')"' : '') + '>' + c + '</button>').join('');
}
function pickCat(c) { S.cat = c; renderCats(); renderMenu(); }
function starHtml(p) {
  const n = Math.round(p.rating);
  return '<span class="stars"><b>' + '★'.repeat(n) + '</b><em>' + '★'.repeat(5 - n) + '</em></span>';
}
function renderMenu() {
  if (!S.service) { $('#prodGrid').innerHTML = '<div class="empty" style="grid-column:1/-1">' + T('shop_choose_service') + '</div>'; return; }
  const catIds = new Set(serviceCats().map(c => c.id));
  const list = S.products.filter(p => catIds.has(p.catId) && (S.cat === 'All' || p.cat === S.cat));
  $('#prodGrid').innerHTML = list.length ? list.map(p => {
    const img = p.img ? '<img src="' + p.img + '" onerror="this.outerHTML=\'<div class=\\\'ph\\\'>' + p.emoji + '</div>\'">' : '<div class="ph">' + p.emoji + '</div>';
    const rv = p.reviews
      ? '<div class="rvc" onclick="openReviews(' + p.id + ')">' + starHtml(p) + '<span class="rc">' + p.rating + ' · ' + p.reviews + ' review' + (p.reviews > 1 ? 's' : '') + '</span></div>'
      : '<div class="rvc" onclick="openReviews(' + p.id + ')"><span class="rc" style="color:var(--gold)">Be the first to review</span></div>';
    return '<div class="pc"><div>' + img + '</div><div class="pb"><div class="tag">' + p.cat + '</div><h3>' + p.name +
      '</h3><p>' + p.desc + '</p>' + rv + '<div class="pf"><span class="price">' + money(p.price) +
      '</span><button class="ab" onclick="add(' + p.id + ')">' + T('shop_add') + '</button></div></div></div>';
  }).join('') : '<div class="empty" style="grid-column:1/-1">' + T('shop_empty') + '</div>';
}

/* ─── Reviews ─── */
async function openReviews(id) {
  const p = S.products.find(x => x.id === id);
  if (!p) return;
  let list = '';
  try {
    const d = await api('/api/reviews?productId=' + id);
    list = d.reviews.length ? d.reviews.map(r =>
      '<div class="rev"><div class="rvt"><span>' + '★'.repeat(r.rating) + '<em>' + '★'.repeat(5 - r.rating) + '</em></span><b>' + esc(r.customer_name) + '</b><i>' + new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + '</i></div>' +
      (r.comment ? '<p>' + esc(r.comment) + '</p>' : '') + '</div>').join('')
      : '<p class="revnone">No reviews yet.</p>';
  } catch (e) { list = '<p class="revnone">Could not load reviews.</p>'; }
  const can = !!S.user;
  const maxLen = S.settings.maxReviewLen || 500;
  $('#revContent').innerHTML =
    '<div class="mt">' + p.name + '</div>' +
    '<div class="ms">What customers say</div>' +
    '<div class="revlist">' + list + '</div>' +
    (can
      ? '<div class="revform"><p class="lbl">Write a review</p>' +
        '<label>Your rating<div class="starsel"><span onclick="pickStar(1)">★</span><span onclick="pickStar(2)">★</span><span onclick="pickStar(3)">★</span><span onclick="pickStar(4)">★</span><span onclick="pickStar(5)">★</span></div></label>' +
        '<label>Comment<textarea id="revTxt" rows="3" maxlength="' + maxLen + '" placeholder="' + (maxLen > 120 ? 'How was it? Tell us a few words…' : 'How was it?') + '"></textarea>' +
        '<span class="revcount" id="revCount">0/' + maxLen + '</span></label>' +
        '<div class="err" id="revErr"></div>' +
        '<button class="auth-btn" onclick="submitReview(' + id + ')">Post review</button></div>'
      : '<p class="revnone">' + T('rev_login') + '</p>');
  S.revStar = 5;
  pickStar(5);
  const rt = $('#revTxt');
  if (rt) rt.addEventListener('input', function () {
    const c = $('#revCount'); if (c) { c.textContent = this.value.length + '/' + maxLen; c.classList.toggle('warn', this.value.length > maxLen - 40); }
  });
  $('#revOvl').classList.add('open'); $('#revBox').classList.add('open');
}
function closeReviews() { $('#revOvl').classList.remove('open'); $('#revBox').classList.remove('open'); }
function pickStar(n) {
  S.revStar = n;
  document.querySelectorAll('.starsel span').forEach((el, i) => el.classList.toggle('on', i < n));
}
async function submitReview(id) {
  try {
    await api('/api/reviews', { method: 'POST', body: JSON.stringify({ productId: id, rating: S.revStar, comment: $('#revTxt').value }) });
    closeReviews(); toast('Thank you for your review!');
    if (S.user) { S.user.reviews = (S.user.reviews || 0) + 1; }
    refreshCatalog();
  } catch (e) { const el = $('#revErr'); el.textContent = e.message; el.style.display = 'block'; }
}
function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ─── Cart ───
function add(id) {
  if (!S.user) { toast(T('shop_login_first')); auth('login'); return; }
  if (!S.settings.toggles.ord) { toast(T('shop_ordering_paused')); return; }
  const p = S.products.find(x => x.id === id);
  const ex = S.cart.find(i => i.id === id);
  if (ex) ex.qty++; else S.cart.push({ id: p.id, name: p.name, price: p.price, emoji: p.emoji, img: p.img || '', qty: 1 });
  saveCart(); renderCart(); $('#cartCount').textContent = cartCount(); toast(p.name + ' ' + T('shop_added'));
}
function cartThumb(i) {
  return i.img
    ? '<img class="ci-img" src="' + i.img + '" alt="' + esc(i.name) + '" onerror="this.outerHTML=\'<div class=\\\'ci-img ph\\\'>' + esc(i.emoji) + '</div>\'">'
    : '<div class="ci-img ph">' + esc(i.emoji) + '</div>';
}
function openCart() { renderCart(); $('#cartOvl').classList.add('open'); $('#cartBox').classList.add('open'); }
function closeCart() { $('#cartOvl').classList.remove('open'); $('#cartBox').classList.remove('open'); }
function qty(id, d) {
  const i = S.cart.find(x => x.id === id); if (!i) return;
  i.qty += d;
  if (i.qty <= 0) S.cart = S.cart.filter(x => x.id !== id);
  saveCart(); renderCart(); $('#cartCount').textContent = cartCount();
}
function renderCart() {
  const el = $('#cartItems'), ft = $('#cartFoot');
  if (!S.cart.length) { el.innerHTML = '<div class="empty"><div style="font-size:2.4rem">☕</div><p>' + T('shop_cart_empty') + '</p></div>'; ft.innerHTML = ''; return; }
  el.innerHTML = S.cart.map(i => '<div class="ci">' + cartThumb(i) + '<div class="ii"><b>' + i.name +
    '</b><div class="pp">' + money(i.price) + '</div><div class="qc"><button class="qb" onclick="qty(' + i.id + ',-1)">−</button><span>' + i.qty +
    '</span><button class="qb" onclick="qty(' + i.id + ',1)">+</button></div></div><button class="rm" onclick="qty(' + i.id + ',-99)">' + T('shop_remove') + '</button></div>').join('');
  ft.innerHTML = '<div class="tot"><span>' + T('shop_total') + '</span><span>' + money(S.cart.reduce((a, i) => a + i.price * i.qty, 0)) +
    '</span></div><button class="buy-btn" onclick="closeCart();go(\'checkout\')">' + T('shop_checkout') + '</button>';
}

// ─── Auth ───
function auth(m) {
  if (m === 'signup' && S.settings.toggles.reg === false) { toast(T('auth_reg_paused')); return; }
  $('#authContent').innerHTML =
    '<div class="mt">' + (m === 'login' ? T('auth_welcome') : T('auth_create')) + '</div>' +
    '<div class="ms">' + (m === 'login' ? T('auth_signin') : T('auth_join')) + '</div>' +
    (m === 'login' ? '' : '<label>' + T('auth_name') + '<input id="auName"></label>') +
    '<label>' + T('auth_email') + '<input id="auEmail" type="email"></label>' +
    (m === 'login' ? '' : '<label>' + T('auth_phone') + '<input id="auPhone" placeholder="+250 7XX XXX XXX"></label>') +
    '<label>' + T('auth_pass') + '<input id="auPass" type="password"></label>' +
    '<div class="err" id="auErr"></div>' +
    '<button class="auth-btn" onclick="submitAuth(\'' + m + '\')">' + (m === 'login' ? T('auth_login_btn') : T('auth_create_btn')) + '</button>' +
    '<div class="swap">' + (m === 'login' ? T('auth_no_account') + ' <b onclick="auth(\'signup\')">' + T('auth_signup_free') + '</b>' : T('auth_have_account') + ' <b onclick="auth(\'login\')">' + T('auth_login2') + '</b>') + '</div>';
  $('#authOvl').classList.add('open'); $('#authBox').classList.add('open');
}
function closeAuth() { $('#authOvl').classList.remove('open'); $('#authBox').classList.remove('open'); }

// ─── My Account ───
async function openAcc() {
  const u = S.user; if (!u) return;
  const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  let gcHtml = '', resHtml = '';
  try {
    const gc = await api('/api/my-giftcards');
    gcHtml = gc.giftcards.length ? gc.giftcards.map(g => '<div class="accRow"><span>' + g.code + '</span><b>' + money(g.balance) + ' left</b></div>').join('') : '<div class="accRow"><span>No gift cards yet</span><b>—</b></div>';
  } catch (e) {}
  try {
    const rs = await api('/api/my-reservations');
    resHtml = rs.reservations.length ? rs.reservations.map(x => '<div class="accRow"><span>' + String(x.res_date).slice(0, 10) + ' ' + x.res_time + '</span><b>' + x.guests + ' guests · ' + x.status + '</b></div>').join('') : '<div class="accRow"><span>No bookings yet</span><b>—</b></div>';
  } catch (e) {}
  $('#accContent').innerHTML =
    '<div class="mt">' + T('acc_title') + '</div>' +
    '<div class="ms">' + T('acc_profile') + ' ' + (S.settings.name || 'MOOD') + '</div>' +
    '<div class="accRow"><span>' + T('acc_name') + '</span><b>' + u.name + '</b></div>' +
    '<div class="accRow"><span>' + T('acc_email') + '</span><b>' + u.email + '</b></div>' +
    '<div class="accRow"><span>' + T('acc_phone') + '</span><b>' + (u.phone || '—') + '</b></div>' +
    (joined ? '<div class="accRow"><span>' + T('acc_member') + '</span><b>' + joined + '</b></div>' : '') +
    '<div class="accRow"><span>Loyalty points</span><b>' + (u.points || 0) + ' pts</b></div>' +
    '<div class="ms">Gift cards</div>' + gcHtml +
    '<div class="ms">Table reservations</div>' + resHtml +
    '<div class="accFoot"><button class="auth-btn" onclick="closeAcc();logout()">' + T('acc_logout') + '</button></div>';
  $('#accOvl').classList.add('open'); $('#accBox').classList.add('open');
}
function closeAcc() { $('#accOvl').classList.remove('open'); $('#accBox').classList.remove('open'); }
async function submitAuth(m) {
  const name = ($('#auName') || {}).value || '';
  const phone = ($('#auPhone') || {}).value || '';
  const email = $('#auEmail').value, pass = $('#auPass').value, err = $('#auErr');
  if (!email.includes('@') || pass.length < 6) { err.textContent = 'Enter a valid email and a 6+ character password.'; err.style.display = 'block'; return; }
  try {
    const j = await api('/api/' + (m === 'login' ? 'login' : 'register'), { method: 'POST', body: JSON.stringify({ name, phone, email, password: pass }) });
    S.user = j.user; closeAuth(); renderNav(); toast(T('auth_welcome_toast') + ' ' + j.user.name.split(' ')[0] + '! ☕');
  } catch (e) { err.textContent = e.message; err.style.display = 'block'; }
}
function logout() {
  askConfirm(T('shop_logout_confirm'), () => {
    try { api('/api/logout', { method: 'POST', body: '{}' }); } catch (e) {}
    S.user = null; S.cart = []; saveCart(); closeAcc(); renderNav(); go('menu'); toast(T('shop_logged_out'));
  });
}

// ─── Confirm modal ───
let cfCb = null;
function askConfirm(msg, cb) {
  $('#cfMsg').textContent = msg; cfCb = cb;
  $('#cfOvl').classList.add('open'); $('#cfBox').classList.add('open');
}
function closeCf() { $('#cfOvl').classList.remove('open'); $('#cfBox').classList.remove('open'); cfCb = null; }
function doCf() { const cb = cfCb; closeCf(); if (cb) cb(); }

// ─── Checkout ───
function renderCheckout() {
  if (!S.cart.length) { go('menu'); return; }
  if (!S.user) { toast(T('shop_please_login')); auth('login'); return; }
  S.promo = null;
  const PAYMAP = { paypal: 'pp', mtn: 'mtn', airtel: 'airtel', card: 'card' };
  const keys = Object.keys(PAY).filter(k => S.settings.toggles[PAYMAP[k]] !== false);
  if (!keys.length) { toast(T('shop_payments_paused')); go('menu'); return; }
  if (keys.indexOf(S.pay) === -1) S.pay = keys[0];
  $('#payOpts').innerHTML = keys.map(k =>
    '<div class="po' + (S.pay === k ? ' sel' : '') + '" data-k="' + k + '" onclick="pickPay(\'' + k + '\')"><div class="pl" style="background:' + PAY[k].bg + ';color:' + (PAY[k].fg || '#fff') + ';display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:.56rem;font-weight:700;letter-spacing:.06em">' + PAY[k].name.toUpperCase() + '</div><div><b>' + PAY[k].name + '</b><span>' + PAY[k].tag + '</span></div></div>').join('');
  $('#payField').innerHTML = '';
  S.points = 0; S.gift = null;
  renderLoyalty(); renderGiftField();
  renderTotals();
}
function pickPay(k) { S.pay = k; document.querySelectorAll('.po').forEach(p => p.classList.toggle('sel', p.getAttribute('data-k') === k)); renderPayField(); }
function renderPayField() {
  const m = S.pay, el = $('#payField');
  if (m === 'paypal' || m === 'card' || m === 'mtn' || m === 'airtel') el.innerHTML = '<p style="font-size:.8rem;font-weight:200;color:rgba(245,230,211,.55)">' + T('co_gateway_note') + '</p>';
}
function renderLoyalty() {
  const el = $('#loyField');
  const on = S.settings.toggles.loyalty !== false;
  const pv = Number(S.settings.pointsValue) || 0;
  if (!on || !S.user || !pv || !Number(S.user.points)) { el.innerHTML = ''; return; }
  const max = Math.floor(Number(S.user.points));
  if (S.points > max) S.points = max;
  el.innerHTML =
    '<div class="loy"><div><b>Redeem loyalty points</b><span>You have <b>' + max + ' pts</b> (worth up to ' + money(max * pv) + ').</span></div>' +
    '<input id="coPoints" type="number" min="0" max="' + max + '" value="' + S.points + '" oninput="loyChg(this.value)"></div>';
}
function loyChg(v) {
  const max = Math.floor(Number(S.user.points));
  S.points = Math.max(0, Math.min(Number(v) || 0, max));
  const inp = $('#coPoints'); if (inp && Number(inp.value) !== S.points) inp.value = S.points;
  renderTotals();
}
function renderGiftField() {
  const el = $('#gcField');
  el.innerHTML = S.gift
    ? '<div class="loy gapp"><div><b>' + S.gift.code + '</b><span>Balance ' + money(S.gift.balance) + '</span></div><b class="grem" onclick="removeGift()">Remove</b></div>'
    : '<div class="loy"><div><b>Gift card</b><span>Enter a code to pay with gift balance.</span></div>' +
      '<span class="gcrow"><input id="coGift" placeholder="MOOD-XXXX-XXXX"><button class="ab" onclick="applyGift()">Apply</button></span></div>';
}
async function applyGift() {
  const code = $('#coGift').value.trim(), msg = $('#gcMsg');
  if (!code) return;
  try { S.gift = await api('/api/giftcard', { method: 'POST', body: JSON.stringify({ code }) }); if (msg) msg.textContent = '✓ ' + T('co_promo_ok'); }
  catch (e) { S.gift = null; if (msg) { msg.style.color = '#e07070'; msg.textContent = T('co_promo_invalid'); } }
  renderGiftField(); renderTotals();
}
function removeGift() { S.gift = null; renderGiftField(); renderTotals(); }
async function applyPromo() {
  const code = $('#coPromo').value.trim(), msg = $('#promoMsg');
  if (!code) return;
  try { S.promo = await api('/api/promo', { method: 'POST', body: JSON.stringify({ code }) }); msg.style.color = '#6fcf97'; msg.textContent = '✓ ' + S.promo.discount + '% ' + T('co_promo_ok'); }
  catch (e) { S.promo = null; msg.style.color = '#e07070'; msg.textContent = T('co_promo_invalid'); }
  renderTotals();
}
function renderTotals() {
  const sub = S.cart.reduce((a, i) => a + i.price * i.qty, 0);
  const disc = S.promo ? sub * S.promo.discount / 100 : 0;
  const gift = S.gift ? Math.min(Number(S.gift.balance), sub - disc) : 0;
  const pv = Number(S.settings.pointsValue) || 0;
  const ptsVal = Math.min(S.points * pv, Math.max(0, sub - disc - gift));
  const fee = (S.settings.freeDelivery > 0 && sub >= S.settings.freeDelivery) ? 0 : (S.settings.deliveryFee || 0);
  $('#sumItems').innerHTML = S.cart.map(i => '<div class="srow"><span>' + i.name + ' ×' + i.qty + '</span><span>' + money(i.price * i.qty) + '</span></div>').join('');
  $('#sumFee').textContent = fee > 0 ? money(fee) : 'Free';
  $('#discRow').style.display = disc ? 'flex' : 'none';
  if (disc) $('#sumDisc').textContent = '-' + money(disc);
  $('#giftRow').style.display = gift ? 'flex' : 'none';
  if (gift) $('#sumGift').textContent = '-' + money(gift);
  $('#ptsRow').style.display = ptsVal ? 'flex' : 'none';
  if (ptsVal) $('#sumPts').textContent = '-' + money(ptsVal);
  $('#sumTotal').textContent = money(Math.max(0, sub - disc - gift - ptsVal + fee));
}
async function placeOrder() {
  const phone = $('#coPhone').value.trim(), addr = $('#coAddr').value.trim();
  if (!phone || !addr) { toast(T('shop_enter_phone')); return; }
  const btn = $('#placeBtn'); btn.disabled = true; btn.textContent = T('shop_processing');
  try {
    const j = await api('/api/orders', { method: 'POST', body: JSON.stringify({
      cart: S.cart, phone, address: addr, notes: $('#coNotes').value, payment: S.pay, promo: S.promo ? S.promo.code : '',
      points: S.points || 0, gift: S.gift ? S.gift.code : ''
    }) });
    if (j.need_payment && j.payment_link) {
      S.pendingPay = j.ref;
      btn.disabled = false; btn.textContent = T('shop_placed');
      window.location.href = j.payment_link;
      return;
    }
    S.cart = []; saveCart(); $('#cartCount').textContent = 0;
    S.user.points = (Number(S.user.points) || 0) - S.points + (Number(j.pointsEarned) || 0);
    S.gift = null; S.points = 0;
    $('#okMsg').innerHTML = T('shop_thanks') + ' <b style="color:var(--gold)">' + j.ref + '</b> ' + T('shop_preparing') + '<br>' + T('shop_total_label') + ' ' + money(j.total) +
      (j.pointsEarned ? '<br>You earned <b style="color:var(--gold)">' + j.pointsEarned + ' loyalty points</b>!' : '');
    go('success');
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = T('shop_placed'); }
}

// ─── Orders ───
function renderOrdersFrom(orders) {
  const stMap = { 'Preparing': T('ord_processing'), 'Delivered': T('ord_delivered'), 'Pending': T('ord_pending'), 'Cancelled': T('ord_cancelled') };
  $('#ordersList').innerHTML = orders.length ? orders.map(o =>
    '<div class="oc"><div class="och"><div class="oid">' + o.id + ' · ' + new Date(o.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    '</div><span class="ost st-' + o.status + '">' + (stMap[o.status] || o.status) + '</span></div><div>' + o.items.map(i => '<span class="ochip">' + i.emoji + ' ' + i.name + ' ×' + i.qty + '</span>').join('') +
    '</div><div class="otr"><span class="otl">' + o.payment.toUpperCase() + '</span><span class="otv">' + money(o.total) + '</span></div></div>').join('')
    : '<div class="ocempty"><div class="oe-cup">☕</div><b>' + T('ord_empty_title') + '</b><p>' + T('ord_empty_sub') + '</p><button class="ab" onclick="go(\'menu\')">' + T('ord_browse') + '</button></div>';
}
async function renderOrders() {
  if (!S.user) { $('#ordersList').innerHTML = '<div class="ocempty"><div class="oe-cup">🍩</div><b>' + T('ord_login_title') + '</b><p>' + T('ord_login_sub') + '</p><button class="ab" onclick="auth(\'login\')">' + T('nav_login') + '</button></div>'; return; }
  try {
    const d = await api('/api/my-orders');
    renderOrdersFrom(d.orders);
  } catch (e) { $('#ordersList').innerHTML = '<div class="empty">' + e.message + '</div>'; }
}

// ─── Live sync ───
// Changes made in the admin panel (new products, prices, settings, order status)
// reach this storefront automatically without a page refresh.
async function sync() {
  try {
    const d = await api('/api/init');
    S.settings = d.settings; S.categories = d.categories; S.products = d.products;
    S.user = d.me;
    if (S.settings.toggles.maint) { showMaintenance(); return; }
    I18N.setAvailableFromToggles(S.settings.toggles);
    const removed = S.cart.filter(i => !S.products.find(p => p.id === i.id && p.avail));
    if (removed.length) { S.cart = S.cart.filter(i => S.products.find(p => p.id === i.id && p.avail)); saveCart(); toast('Some items are no longer available'); }
    S.cart.forEach(i => { const p = S.products.find(x => x.id === i.id); if (p) { i.price = p.price; i.name = p.name; i.emoji = p.emoji; i.img = p.img || ''; } });
    saveCart();
    renderSettings(); applyImages(d.images); renderNav(); renderCats();
    $('#cartCount').textContent = cartCount();
    if ($('#menuView').style.display !== 'none') renderMenu();
    if ($('#ordersView').style.display !== 'none') renderOrders();
    if ($('#checkoutView').style.display !== 'none') renderTotals();
  } catch (e) {}
}
setInterval(sync, 25000);

init();
