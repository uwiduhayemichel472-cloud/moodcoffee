/* MOOD — Admin announcements widget.
   Shows a floating microphone button (with a pulsing ring when there is
   something new) that opens the latest announcement from the admin panel.
   Loaded on the landing page and the online shop. */
(function () {
  if (window.__moodAnn) return;
  window.__moodAnn = true;

  var SEEN_KEY = 'mood_ann_seen';
  var t = function (k) {
    try { return (window.I18N && I18N.t(k)) || k; } catch (e) { return k; }
  };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  var css =
    '.mood-ann-btn{position:fixed;left:22px;bottom:22px;z-index:900;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;' +
    'background:radial-gradient(circle at 30% 25%,#c95b3c,#8c2b16);box-shadow:0 8px 24px rgba(0,0,0,.45);' +
    'display:flex;align-items:center;justify-content:center;transition:transform .2s;color:#fff}' +
    '.mood-ann-btn:hover{transform:scale(1.09)}' +
    '.mood-ann-btn svg{width:26px;height:26px;fill:#fff}' +
    '.mood-ann-ring{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(231,111,81,.55);animation:moodAnnPulse 1.8s ease-out infinite}' +
    '.mood-ann-dot{position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;border-radius:9px;background:#e2b03c;color:#2b1200;' +
    'font-size:.62rem;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;' +
    'border:2px solid #1a0a00}' +
    '@keyframes moodAnnPulse{0%{transform:scale(1);opacity:.9}70%{transform:scale(1.65);opacity:0}100%{opacity:0}}' +
    '.mood-ann-ovl{position:fixed;inset:0;background:rgba(5,2,0,.72);z-index:1200;display:none;align-items:center;justify-content:center;padding:20px}' +
    '.mood-ann-ovl.open{display:flex}' +
    '.mood-ann-modal{position:relative;width:100%;max-width:430px;max-height:80vh;overflow:auto;background:linear-gradient(160deg,#2c1200,#1a0a00);' +
    'border:1px solid rgba(212,160,96,.25);border-radius:16px;padding:34px 30px 28px;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,.55);' +
    'animation:moodAnnIn .28s both}' +
    '@keyframes moodAnnIn{from{opacity:0;transform:translateY(22px) scale(.97)}to{opacity:1;transform:none}}' +
    '.mood-ann-mic{width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#c95b3c,#8c2b16);' +
    'display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 10px 26px rgba(140,43,22,.4)}' +
    '.mood-ann-mic svg{width:28px;height:28px;fill:#fff}' +
    '.mood-ann-title{font-family:"Cormorant Garamond",serif;font-size:1.55rem;font-weight:400;color:#f5e6d3;margin:0 0 12px}' +
    '.mood-ann-msg{font-size:.92rem;font-weight:200;color:rgba(245,230,211,.78);line-height:1.75;margin:0 0 20px;white-space:pre-line}' +
    '.mood-ann-nav{display:flex;justify-content:center;gap:6px;margin-bottom:20px}' +
    '.mood-ann-dotnav{width:7px;height:7px;border-radius:50%;background:rgba(245,230,211,.25);transition:.25s}' +
    '.mood-ann-dotnav.on{background:#d4a060;transform:scale(1.25)}' +
    '.mood-ann-act{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}' +
    '.mood-ann-btn2{padding:12px 26px;border-radius:6px;border:none;cursor:pointer;font-family:"Jost",sans-serif;font-size:.66rem;' +
    'letter-spacing:.16em;text-transform:uppercase;transition:.25s}' +
    '.mood-ann-gold{background:linear-gradient(135deg,#e2b03c,#b8860b);color:#2b1200;font-weight:500}' +
    '.mood-ann-gold:hover{filter:brightness(1.08)}' +
    '.mood-ann-ghost{background:transparent;color:rgba(245,230,211,.75);border:1px solid rgba(212,160,96,.35)}' +
    '.mood-ann-ghost:hover{background:rgba(212,160,96,.12)}' +
    '.mood-ann-x{position:absolute;top:14px;right:18px;background:none;border:none;color:rgba(245,230,211,.45);font-size:1.4rem;cursor:pointer}' +
    '.mood-ann-x:hover{color:#d4a060}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var MIC = '<svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3z"/><path d="M19 12a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12h-2z"/></svg>';

  var anns = [];
  var idx = 0;
  var btn, ovl, modal;

  function seen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch (e) { return []; }
  }
  function isNew(a) { return seen().indexOf(a.id) === -1; }
  function markSeen(a) {
    var s = seen();
    if (s.indexOf(a.id) === -1) s.push(a.id);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function render() {
    if (!anns.length) return;
    var anyNew = anns.some(isNew);
    var a = anns[Math.min(idx, anns.length - 1)];
    btn.style.display = 'flex';
    btn.querySelector('.mood-ann-ring').style.display = anyNew ? 'block' : 'none';
    btn.querySelector('.mood-ann-dot').style.display = anyNew ? 'flex' : 'none';
    btn.querySelector('.mood-ann-dot').textContent = anns.filter(isNew).length;
    var nav = anns.length > 1
      ? '<div class="mood-ann-nav">' + anns.map(function (x, i) { return '<span class="mood-ann-dotnav' + (i === idx ? ' on' : '') + '"></span>'; }).join('') + '</div>'
      : '';
    modal.innerHTML =
      '<button class="mood-ann-x" onclick="window.__moodAnnClose()" aria-label="' + t('ann_close') + '">&times;</button>' +
      '<div class="mood-ann-mic">' + MIC + '</div>' +
      (a.title ? '<h3 class="mood-ann-title">' + esc(a.title) + '</h3>' : '') +
      '<p class="mood-ann-msg">' + esc(a.message) + '</p>' +
      nav +
      '<div class="mood-ann-act">' +
      (anns.length > 1 ? '<button class="mood-ann-btn2 mood-ann-ghost" onclick="window.__moodAnnNav(-1)">' + t('ann_prev') + '</button>' : '') +
      '<button class="mood-ann-btn2 mood-ann-gold" onclick="window.__moodAnnGot()">' + t('ann_got') + '</button>' +
      (anns.length > 1 ? '<button class="mood-ann-btn2 mood-ann-ghost" onclick="window.__moodAnnNav(1)">' + t('ann_next') + '</button>' : '') +
      '</div>';
  }

  function open() { ovl.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function close() { ovl.classList.remove('open'); document.body.style.overflow = ''; }
  window.__moodAnnClose = close;
  window.__moodAnnNav = function (d) {
    idx = (idx + d + anns.length) % anns.length;
    render();
  };
  window.__moodAnnGot = function () {
    anns.forEach(markSeen);
    render();
    close();
  };

  btn = document.createElement('button');
  btn.className = 'mood-ann-btn';
  btn.style.display = 'none';
  btn.setAttribute('aria-label', t('ann_new'));
  btn.title = t('ann_new');
  btn.innerHTML = '<span class="mood-ann-ring"></span>' + MIC + '<span class="mood-ann-dot"></span>';
  btn.addEventListener('click', function () { open(); render(); });
  document.body.appendChild(btn);

  ovl = document.createElement('div');
  ovl.className = 'mood-ann-ovl';
  ovl.addEventListener('click', function (e) { if (e.target === ovl) close(); });
  modal = document.createElement('div');
  modal.className = 'mood-ann-modal';
  ovl.appendChild(modal);
  document.body.appendChild(ovl);

  fetch('/api/announcements', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      anns = (j && j.announcements) || [];
      if (anns.length) render();
    })
    .catch(function () {});

  window.addEventListener('i18n:changed', function () {
    if (anns.length) render();
  });
})();
