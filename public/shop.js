/* MOOD Coffee Shop & Bakery — storefront */
const $ = s => document.querySelector(s);
const money = n => { const c = (S.settings && S.settings.currency) || 'USD'; return (c === 'RWF' ? 'RWF ' : '$') + Number(n || 0).toFixed(c === 'RWF' ? 0 : 2); };
const S = { cart: JSON.parse(localStorage.getItem('mood_cart') || '[]'), user: null, settings: {}, products: [], categories: [], cat: 'All', pay: 'mtn', promo: null, service: null, points: 0, gift: null, orders: [] };

const PAY = {
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

function shopNavToggle() {
  const h = document.querySelector('header'), n = document.querySelector('header nav');
  if (n) n.classList.toggle('open');
  if (h) h.classList.toggle('open');
}
(function () {
  const n = document.querySelector('header nav');
  if (!n) return;
  n.addEventListener('click', function (e) {
    if (e.target.closest('a,button') && !e.target.closest('.lang-switch') && !e.target.closest('.lang-menu'))
      shopNavToggle();
  });
})();

async function api(url, opt) {
  const r = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opt));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed.');
  return j;
}

async function init() {
  const qp = new URLSearchParams(location.search);
  const paidRef = qp.get('paid'), payFail = qp.get('payfail'), pendingRef = qp.get('pending');
  try {
    const d = await api('/api/init');
    S.settings = d.settings; S.categories = d.categories; S.products = d.products; S.user = d.me;
    if (S.settings.toggles.maint) { showMaintenance(); return; }
    I18N.setAvailableFromToggles(S.settings.toggles);
    renderSettings(); applyImages(d.images);
    try {
      const add = localStorage.getItem('mood_add');
      if (add) {
        localStorage.removeItem('mood_add');
        const pid = JSON.parse(add).id;
        const p = S.products.find(x => x.id === pid);
        if (p && p.avail) addToCart(pid);
      }
    } catch (e) {}
  } catch (e) { toast('Could not reach server.'); }
  renderNav(); renderCats(); renderMenu();
  if (qp.get('google')) {
    if (S.user) toast(T('auth_welcome_toast') + ' ' + S.user.name.split(' ')[0] + '! ☕');
    if (window.opener) { window.opener.postMessage('mood-google-auth', location.origin); window.close(); }
  }
  if (paidRef) {
    S.cart = []; saveCart(); $('#cartCount').textContent = 0; S.gift = null; S.points = 0;
    $('#okMsg').innerHTML = T('shop_thanks') + ' <b style="color:var(--gold)">' + paidRef + '</b><br>' + T('shop_paid_confirm');
    go('success');
  } else if (pendingRef) {
    showPaying(pendingRef);
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
  ['menu', 'checkout', 'orders', 'success', 'paying'].forEach(x => $('#' + x + 'View').style.display = x === v ? 'block' : 'none');
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
  const title = S.service === 'bakery' ? T('svc_bakery_title') : T('svc_coffee_title');
  $('#svcChip').style.display = 'flex';
  $('#svcChip').innerHTML =
    '<div class="svc-info">' +
      '<span class="svc-lbl">' + T('svc_current') + '</span>' +
      '<b class="svc-name">' + title + '</b>' +
    '</div>' +
    '<button class="svc-switch" onclick="openService()">' + T('svc_switch') + ' &rarr;</button>';
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
function googleAuthHtml() {
  if (!S.settings.googleAuth) return '';
  return '<button type="button" class="auth-google" onclick="googleLogin()">' +
    '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37.5 39.4 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>' +
    '<span>' + T('auth_google') + '</span></button>' +
    '<div class="authDivider"><span>' + T('auth_or') + '</span></div>';
}
function googleLogin() {
  const w = window.open('/api/auth/google/start', 'mood_google', 'width=520,height=660');
  if (!w) location.href = '/api/auth/google/start';
}
window.addEventListener('message', function (e) {
  if (e.data === 'mood-google-auth' && e.origin === location.origin) location.reload();
});
function auth(m) {
  if (m === 'signup' && S.settings.toggles.reg === false) { toast(T('auth_reg_paused')); return; }
  $('#authContent').innerHTML =
    '<div class="mt">' + (m === 'login' ? T('auth_welcome') : T('auth_create')) + '</div>' +
    '<div class="ms">' + (m === 'login' ? T('auth_signin') : T('auth_join')) + '</div>' +
    googleAuthHtml() +
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
function copyCode(txt) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast(T('acc_copied')))
    .catch(() => { const el = document.createElement('input'); el.value = txt; document.body.appendChild(el); el.select(); try { document.execCommand('copy'); toast(T('acc_copied')); } catch (e) {} document.body.removeChild(el); });
}
function loyaltyHtml() {
  const on = S.settings.toggles.loyalty !== false;
  const pv = Number(S.settings.pointsValue) || 0;
  const thr = Math.max(1, Number(S.settings.loyaltyThreshold) || 100);
  const pts = Number(S.user.points) || 0;
  const pct = Math.min(100, Math.round((pts % thr) / thr * 100));
  const worth = money(pts * pv);
  return '<div class="ms">' + T('acc_loyalty') + '</div>' +
    '<div class="loycard">' +
    '<div class="loybar"><i style="width:' + pct + '%"></i></div>' +
    '<div class="loycap"><b>' + pts + ' pts</b><span>' + T('acc_pts_worth') + ' ' + worth + '</span></div>' +
    (on && pv > 0 ? '<p class="loynext">' + (thr - (pts % thr)) + ' ' + T('acc_next_reward') + '</p>' : '<p class="loynext">' + T('acc_rewards_off') + '</p>') +
    '</div>';
}
function rewardsHtml(list) {
  if (!list.length) return '<div class="accEmpty">' + T('acc_rewards_none') + '</div>';
  return list.map(r => '<div class="accRow rwrow"><span><b class="rwt">' + esc(r.title) + '</b><code>' + esc(r.code) + '</code></span>' +
    (r.status ? '<b class="rw-val">' + money(r.value) + '</b><button class="rw-copy" onclick="copyCode(\'' + esc(r.code) + '\')">' + T('acc_copy') + '</button>' : '<b class="rw-used">' + T('acc_rewards_used') + '</b>') + '</div>').join('');
}
function giftcardsHtml(list) {
  if (!list.length) return '<div class="accRow"><span>' + T('acc_gift_none') + '</span><b>—</b></div>';
  return list.map(g => '<div class="accRow rwrow"><span><code>' + esc(g.code) + '</code></span><b class="rw-val">' + money(g.balance) + ' ' + T('acc_gift_left') + '</b><button class="rw-copy" onclick="copyCode(\'' + esc(g.code) + '\')">' + T('acc_copy') + '</button></div>').join('');
}
function toggleGiftForm() { const f = $('#gcBuyForm'); if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none'; }
async function buyGift() {
  const amt = Number($('#gcAmt').value);
  const btn = $('#gcBuyBtn');
  const msg = $('#gcBuyMsg');
  if (!amt || amt < 1) { msg.textContent = T('acc_gift_invalid'); msg.className = 'gcerr'; return; }
  btn.disabled = true;
  try {
    const j = await api('/api/giftcards', { method: 'POST', body: JSON.stringify({
      amount: amt, recipientName: $('#gcRec').value, recipientEmail: $('#gcRecMail').value, message: $('#gcMsgTxt').value
    }) });
    msg.innerHTML = T('acc_gift_ok') + ' <code>' + esc(j.code) + '</code>' + (j.emailed ? ' · ' + T('acc_gift_emailed') : '');
    msg.className = 'gcok';
    $('#gcAmt').value = ''; $('#gcRec').value = ''; $('#gcRecMail').value = ''; $('#gcMsgTxt').value = '';
    if (S.user) { try { const g = await api('/api/my-giftcards'); $('#gcList').innerHTML = giftcardsHtml(g.giftcards); } catch (e) {} }
  } catch (e) { msg.textContent = e.message; msg.className = 'gcerr'; }
  btn.disabled = false;
}
async function openAcc() {
  const u = S.user; if (!u) return;
  const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  let gcHtml = '<div class="accRow"><span>…</span><b>—</b></div>', resHtml = '', rwHtml = '';
  try { const gc = await api('/api/my-giftcards'); gcHtml = giftcardsHtml(gc.giftcards); } catch (e) {}
  try { const rs = await api('/api/my-reservations'); resHtml = rs.reservations.length ? rs.reservations.map(x => '<div class="accRow"><span>' + String(x.res_date).slice(0, 10) + ' ' + x.res_time + '</span><b>' + x.guests + ' guests · ' + x.status + '</b></div>').join('') : '<div class="accRow"><span>' + T('acc_res_none') + '</span><b>—</b></div>'; } catch (e) {}
  try { const rw = await api('/api/my-rewards'); rwHtml = rewardsHtml(rw.rewards); } catch (e) {}
  $('#accContent').innerHTML =
    '<div class="mt">' + T('acc_title') + '</div>' +
    '<div class="ms">' + T('acc_profile') + ' ' + (S.settings.name || 'MOOD') + '</div>' +
    '<div class="accRow"><span>' + T('acc_name') + '</span><b>' + u.name + '</b></div>' +
    '<div class="accRow"><span>' + T('acc_email') + '</span><b>' + u.email + '</b></div>' +
    '<div class="accRow"><span>' + T('acc_phone') + '</span><b>' + (u.phone || '—') + '</b></div>' +
    (joined ? '<div class="accRow"><span>' + T('acc_member') + '</span><b>' + joined + '</b></div>' : '') +
    loyaltyHtml() +
    '<div class="ms">' + T('acc_rewards') + '</div>' + rwHtml +
    '<div class="ms">' + T('acc_gift_title') + ' <b class="acc-giftbtn" onclick="toggleGiftForm()">+ ' + T('acc_buy_gift') + '</b></div>' +
    '<div id="gcList">' + gcHtml + '</div>' +
    '<div class="gcform" id="gcBuyForm" style="display:none">' +
    '<label><span>' + T('acc_gift_amt') + '</span><input id="gcAmt" type="number" min="1" max="500" placeholder="10"></label>' +
    '<label><span>' + T('acc_gift_to') + '</span><input id="gcRec" placeholder="Aline"></label>' +
    '<label><span>' + T('acc_gift_mail') + '</span><input id="gcRecMail" type="email" placeholder="friend@example.com"></label>' +
    '<label><span>' + T('acc_gift_msg') + '</span><input id="gcMsgTxt" placeholder="Enjoy your coffee! ☕"></label>' +
    '<p id="gcBuyMsg"></p>' +
    '<button class="auth-btn" id="gcBuyBtn" onclick="buyGift()">' + T('acc_gift_btn') + '</button></div>' +
    '<div class="ms">' + T('acc_bookings') + '</div>' + resHtml +
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
  const keys = Object.keys(PAY).filter(k => S.settings.toggles[k] !== false && (k !== 'card' || !!S.settings.flwEncKey));
  if (!keys.length) { toast(T('shop_payments_paused')); go('menu'); return; }
  if (keys.indexOf(S.pay) === -1) S.pay = keys[0];
  $('#payOpts').innerHTML = keys.map(k =>
    '<div class="po' + (S.pay === k ? ' sel' : '') + '" data-k="' + k + '" onclick="pickPay(\'' + k + '\')"><div class="pl" style="background:' + PAY[k].bg + ';color:' + (PAY[k].fg || '#fff') + ';display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:.56rem;font-weight:700;letter-spacing:.06em">' + PAY[k].name.toUpperCase() + '</div><div><b>' + PAY[k].name + '</b><span>' + PAY[k].tag + '</span></div></div>').join('');
  $('#payField').innerHTML = '';
  $('#payNote').textContent = S.settings.onlinePay ? T('co_secure') : T('co_demo_note');
  S.points = 0; S.gift = null;
  renderLoyalty(); renderGiftField();
  renderTotals();
}
function pickPay(k) { S.pay = k; document.querySelectorAll('.po').forEach(p => p.classList.toggle('sel', p.getAttribute('data-k') === k)); renderPayField(); }
function renderPayField() {
  const m = S.pay, el = $('#payField');
  if (m === 'card') {
    el.innerHTML =
      '<label><span>Name on card</span><input id="pcName" autocomplete="cc-name" placeholder="YOUR NAME"></label>' +
      '<label><span>Card number</span><input id="pcNum" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000"></label>' +
      '<div class="row2"><label><span>Expiry (MM/YY)</span><input id="pcExp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY"></label>' +
      '<label><span>CVV</span><input id="pcCvv" inputmode="numeric" autocomplete="cc-csc" placeholder="123"></label></div>' +
      '<p class="pmnote">' + T('co_card_secure') + '</p>';
    cardFormat();
  } else if (m === 'mtn' || m === 'airtel') {
    el.innerHTML =
      '<label><span>' + (m === 'mtn' ? 'MTN MoMo number' : 'Airtel Money number') + '</span>' +
      '<input id="pcMoMo" inputmode="tel" placeholder="+250 7XX XXX XXX" value="' + esc($('#coPhone').value) + '"></label>' +
      '<p class="pmnote">' + T('co_momo_note') + '</p>';
  } else {
    el.innerHTML = '';
  }
}
function cardFormat() {
  const num = $('#pcNum'), exp = $('#pcExp');
  if (num) num.addEventListener('input', () => { num.value = num.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19); });
  if (exp) exp.addEventListener('input', () => { const v = exp.value.replace(/[^\d]/g, ''); exp.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2, 4) : v; });
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
    ? '<div class="loy gapp"><div><b>' + S.gift.code + '</b><span>' + (S.gift.kind === 'reward' ? esc(S.gift.title || T('co_reward_label')) : T('acc_gift_left')) + ' ' + money(S.gift.balance) + '</span></div><b class="grem" onclick="removeGift()">' + T('shop_remove') + '</b></div>'
    : '<div class="loy"><div><b>' + T('co_gift_label') + '</b><span>' + T('co_gift_hint') + '</span></div>' +
      '<span class="gcrow"><input id="coGift" placeholder="MOOD-XXXX-XXXX"><button class="ab" onclick="applyGift()">' + T('co_apply') + '</button></span></div>';
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
  const fee = (S.settings.freeDelivery > 0 && sub >= S.settings.freeDelivery) ? 0 : Math.max(0, Number(S.settings.deliveryFee) || 0);
  $('#sumItems').innerHTML = S.cart.map(i => '<div class="srow"><span>' + i.name + ' ×' + i.qty + '</span><span>' + money(i.price * i.qty) + '</span></div>').join('');
  $('#sumFee').textContent = fee > 0 ? money(fee) : 'Free';
  $('#discRow').style.display = disc ? 'flex' : 'none';
  if (disc) $('#sumDisc').textContent = '-' + money(disc);
  $('#giftRow').style.display = gift ? 'flex' : 'none';
  if (gift) { $('#giftRowLabel').textContent = S.gift && S.gift.kind === 'reward' ? T('co_reward_label') : T('co_gift_label'); $('#sumGift').textContent = '-' + money(gift); }
  $('#ptsRow').style.display = ptsVal ? 'flex' : 'none';
  if (ptsVal) $('#sumPts').textContent = '-' + money(ptsVal);
  $('#sumTotal').textContent = money(Math.max(0, sub - disc - gift - ptsVal + fee));
}
async function placeOrder() {
  const phone = $('#coPhone').value.trim(), addr = $('#coAddr').value.trim();
  if (!phone || !addr) { toast(T('shop_enter_phone')); return; }
  const btn = $('#placeBtn'); btn.disabled = true; btn.textContent = T('shop_processing');
  let card = null;
  try {
    if (S.pay === 'card') card = await cardPayload();
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = T('shop_placed'); return; }
  const momoPhone = (S.pay === 'mtn' || S.pay === 'airtel') && $('#pcMoMo') ? $('#pcMoMo').value.trim() : '';
  try {
    const j = await api('/api/orders', { method: 'POST', body: JSON.stringify({
      cart: S.cart, phone, address: addr, notes: $('#coNotes').value, payment: S.pay, promo: S.promo ? S.promo.code : '',
      points: S.points || 0, gift: S.gift ? S.gift.code : '', payPhone: momoPhone, card
    }) });
    if (j.need_payment) {
      S.pendingPay = j.ref;
      btn.disabled = false; btn.textContent = T('shop_placed');
      if (j.payment_link) { window.location.href = j.payment_link; return; }
      showPaying(j.ref, j.instruction);
      return;
    }
    S.cart = []; saveCart(); $('#cartCount').textContent = 0;
    S.user.points = (Number(S.user.points) || 0) - S.points + (Number(j.pointsEarned) || 0);
    S.gift = null; S.points = 0;
    $('#okMsg').innerHTML = T('shop_thanks') + ' <b style="color:var(--gold)">' + j.ref + '</b> ' + T('shop_preparing') + '<br>' + T('shop_total_label') + ' ' + money(j.total) +
      (j.pointsEarned ? '<br>You earned <b style="color:var(--gold)">' + j.pointsEarned + ' loyalty points</b>!' : '') +
      (j.rewardsIssued && j.reward ? '<br>🎉 ' + esc(j.reward.title) + ' unlocked — code <b style="color:var(--gold)">' + esc(j.reward.code) + '</b>. Find it in your account.' : '');
    go('success');
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = T('shop_placed'); }
}

// ─── Card encryption (Flutterwave v4 AesGcm) ───
function randNonce(len) {
  const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}
async function encryptField(keyB64, nonce, data) {
  const raw = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt']);
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new TextEncoder().encode(nonce) }, key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(enc)));
}
async function cardPayload() {
  const num = $('#pcNum').value.replace(/[^\d]/g, '');
  const exp = $('#pcExp').value.replace(/[^\d]/g, '');
  const cvv = $('#pcCvv').value.replace(/[^\d]/g, '');
  const mm = exp.slice(0, 2), yy = exp.slice(2, 4);
  if (num.length < 15 || mm.length !== 2 || yy.length !== 2 || cvv.length < 3)
    throw new Error(T('co_card_invalid'));
  const key = S.settings.flwEncKey;
  if (!key) throw new Error(T('co_card_unavailable'));
  const nonce = randNonce(12);
  return {
    nonce,
    encrypted_card_number: await encryptField(key, nonce, num),
    encrypted_expiry_month: await encryptField(key, nonce, mm),
    encrypted_expiry_year: await encryptField(key, nonce, yy),
    encrypted_cvv: await encryptField(key, nonce, cvv)
  };
}

// ─── "Check your phone" waiting screen (mobile-money push) ───
let payPoll = null;
function showPaying(ref, instruction) {
  S.pendingPay = ref;
  $('#payRef').textContent = ref;
  $('#payStatus').textContent = T('pay_awaiting');
  const inst = $('#payInst');
  if (instruction && inst) { inst.textContent = instruction; inst.style.display = 'block'; }
  go('paying');
  clearInterval(payPoll);
  payPoll = setInterval(async () => {
    try {
      const j = await api('/api/pay/status?ref=' + encodeURIComponent(ref));
      if (j.paid) {
        clearInterval(payPoll);
        S.cart = []; saveCart(); $('#cartCount').textContent = 0;
        S.gift = null; S.points = 0;
        try { const me = await api('/api/me'); S.user = me.user; } catch (e) {}
        $('#okMsg').innerHTML = T('shop_thanks') + ' <b style="color:var(--gold)">' + ref + '</b><br>' + T('shop_paid_confirm');
        go('success');
      } else if (j.failed) {
        clearInterval(payPoll);
        toast(T('shop_pay_cancelled'));
        go('menu');
      }
    } catch (e) {}
  }, 4000);
}

// ─── Orders ───
const EMPTY_IMG = '<div class="oe-media"><img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=70&auto=format&fit=crop" alt="Freshly brewed coffee"><img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=70&auto=format&fit=crop" alt="Freshly baked bread"></div>';
function trackHtml(o) {
  if (o.status === 'Cancelled') return '<div class="track track-x"><span class="tx">' + T('ord_cancelled') + '</span></div>';
  const st = { 'Pending': 0, 'Preparing': 1, 'Delivered': 2 }[o.status];
  const steps = [T('ord_step1'), T('ord_step2'), T('ord_step3')];
  let h = '<div class="track' + (o.status === 'Pending' ? ' tr-pending' : '') + '">';
  steps.forEach((s, i) => {
    h += '<div class="ts' + (i <= st ? ' on' : '') + (i === st ? ' cur' : '') + '"><i>' + (i < st ? '✓' : (i === st && o.status !== 'Pending' && st > 0 ? '' : '')) + '</i><span>' + s + '</span></div>';
    if (i < steps.length - 1) h += '<div class="tl' + (i < st ? ' on' : '') + '"></div>';
  });
  return h + '</div>';
}
function renderOrdersFrom(orders) {
  S.orders = orders;
  const stMap = { 'Preparing': T('ord_processing'), 'Delivered': T('ord_delivered'), 'Pending': T('ord_pending'), 'Cancelled': T('ord_cancelled') };
  $('#ordersList').innerHTML = orders.length ? orders.map(o =>
    '<div class="oc"><div class="och"><div class="oid">' + o.id + ' · ' + new Date(o.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    '</div><span class="ost st-' + o.status + '">' + (stMap[o.status] || o.status) + '</span></div>' +
    trackHtml(o) +
    '<div class="oitems">' + o.items.map(i => '<span class="ochip">' + i.emoji + ' ' + i.name + ' ×' + i.qty + '</span>').join('') + '</div>' +
    '<div class="otr"><span class="otl">' + o.payment.toUpperCase() + '</span><span class="otv">' + money(o.total) + '</span>' +
    (o.status !== 'Cancelled' && o.status !== 'Pending' ? '<button class="reorder" onclick="reorder(\'' + o.id + '\')">↻ ' + T('ord_reorder') + '</button>' : '') + '</div></div>').join('')
    : '<div class="ocempty">' + EMPTY_IMG + '<b>' + T('ord_empty_title') + '</b><p>' + T('ord_empty_sub') + '</p><button class="ab" onclick="go(\'menu\')">' + T('ord_browse') + '</button></div>';
}
function reorder(ref) {
  const o = S.orders.find(x => x.id === ref);
  if (!o || !S.user) { auth('login'); return; }
  const now = [], missing = [];
  o.items.forEach(it => {
    const p = it.productId ? S.products.find(x => x.id === it.productId) : null;
    if (!p || !p.avail) { missing.push(it.name); return; }
    const ex = now.find(x => x.id === p.id);
    if (ex) ex.qty += it.qty;
    else now.push({ id: p.id, name: p.name, price: p.price, emoji: p.emoji, img: p.img || '', qty: it.qty });
  });
  if (!now.length) { toast(T('ord_reorder_unavail')); return; }
  S.cart = now; saveCart(); $('#cartCount').textContent = cartCount();
  toast(missing.length ? T('ord_reorder_skip') + ' ' + missing.slice(0, 2).join(', ') : T('ord_reorder_done'));
  go('checkout');
}
async function renderOrders() {
  if (!S.user) { $('#ordersList').innerHTML = '<div class="ocempty">' + EMPTY_IMG + '<b>' + T('ord_login_title') + '</b><p>' + T('ord_login_sub') + '</p><button class="ab" onclick="auth(\'login\')">' + T('nav_login') + '</button></div>'; return; }
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
