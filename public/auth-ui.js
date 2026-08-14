/* MOOD — shared Login / Sign-up modal styling + promotional video loader.
   Loaded by the landing page (index.html) and the shop (shop.html), so the
   redesign lives in one place instead of being duplicated. */
(function () {
  if (window.moodAuthUI) return;
  window.moodAuthUI = true;

  var CSS =
    '#authBox{max-width:940px;width:96vw;padding:0;border-radius:16px;overflow:hidden;background:#2b1203;border:1px solid rgba(212,160,96,.3);box-shadow:0 40px 90px rgba(0,0,0,.55)}' +
    '#authBox .x{top:16px;right:18px;z-index:30;color:rgba(245,230,211,.85)}' +
    '.mood-auth-split{display:grid;grid-template-columns:57% 43%;min-height:560px;max-height:88vh}' +
    '.mood-auth-media{position:relative;overflow:hidden;background:#1a0a00 url(\'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200&q=80&auto=format&fit=crop\') center/cover no-repeat;min-height:560px}' +
    '.mood-auth-media::after{content:\'\';position:absolute;inset:0;z-index:2;background:linear-gradient(120deg,rgba(18,7,0,.15) 35%,rgba(12,5,0,.55))}' +
    '.mood-auth-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}' +
    '.mood-auth-brand{position:absolute;left:24px;bottom:20px;z-index:3;font-family:\'Cormorant Garamond\',serif;font-weight:300;font-size:1.4rem;letter-spacing:.16em;color:#fdf6ee;text-transform:uppercase;text-shadow:0 2px 14px rgba(0,0,0,.5)}' +
    '.mood-auth-brand b{color:#e8c080;font-weight:300}' +
    '.mood-auth-form{padding:36px 38px 30px;overflow-y:auto;background:linear-gradient(180deg,#2c1200,#1d0b00);display:flex;min-height:0}' +
    '.mood-auth-in{margin:auto 0;width:100%}' +
    '.mood-auth-form .mt{font-size:1.85rem;margin-bottom:4px}' +
    '.mood-auth-form .ms{margin-bottom:16px;color:rgba(245,230,211,.55)}' +
    '.mood-auth-form label{margin-bottom:10px;font-size:.58rem;letter-spacing:.18em;color:var(--gold,#d4a060)}' +
    '.mood-auth-form label input{margin-top:6px;padding:12px 14px;background:rgba(5,2,0,.5);border:1px solid rgba(212,160,96,.22);color:var(--cream,#f5e6d3);font-family:\'Jost\',sans-serif;font-size:.88rem;outline:none;border-radius:8px}' +
    '.mood-auth-form label input:focus{border-color:var(--gold,#d4a060)}' +
    '.mood-auth-form .auth-btn{margin-top:8px;padding:14px;border-radius:8px;font-size:.7rem}' +
    '@media(max-width:820px){' +
      '#authBox{width:94vw;max-height:92vh}' +
      '.mood-auth-split{grid-template-columns:1fr;min-height:0;max-height:none}' +
      '.mood-auth-media{height:170px;min-height:0}' +
      '.mood-auth-form{padding:24px 22px;display:block;max-height:calc(92vh - 170px)}' +
      '.mood-auth-in{margin:0}' +
      '#authBox .x{color:#fdf6ee}' +
    '}';

  var st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  window.moodAuthMediaHtml = function () {
    return '<div class="mood-auth-media">' +
      '<video class="mood-auth-video" muted loop playsinline preload="metadata"></video>' +
      '<div class="mood-auth-brand">MOOD<b>.</b></div>' +
      '</div>';
  };

  window.moodAuthMediaInit = function () {
    var v = document.querySelector('.mood-auth-video');
    if (!v) return;
    fetch('/api/auth-video', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.video && j.video.url) {
        v.src = j.video.url;
        var tryPlay = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
        v.onloadeddata = tryPlay;
        v.load();
        v.addEventListener('mouseenter', tryPlay);
        v.addEventListener('mouseleave', function () { try { v.pause(); } catch (e) {} });
      }
    }).catch(function () {});
  };
})();
