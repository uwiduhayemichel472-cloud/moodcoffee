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
    '.mood-auth-media{position:relative;overflow:hidden;background:#1a0a00;min-height:560px}' +
    '.mood-auth-media::before{content:\'\';position:absolute;inset:-30%;z-index:1;background:radial-gradient(circle at 28% 22%,rgba(232,192,128,.22),transparent 44%),radial-gradient(circle at 78% 82%,rgba(212,160,96,.15),transparent 52%);animation:moodGold 16s ease-in-out infinite alternate}' +
    '@keyframes moodGold{0%{transform:translate3d(-5%,-3%,0) scale(1);opacity:.85}100%{transform:translate3d(5%,4%,0) scale(1.18);opacity:1}}' +
    '.mood-auth-media::after{content:\'\';position:absolute;inset:0;z-index:2;background:linear-gradient(120deg,rgba(18,7,0,.25) 35%,rgba(12,5,0,.62))}' +
    '.mood-auth-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:3}' +
    '.mood-auth-words{position:absolute;inset:0;z-index:4;overflow:hidden}' +
    '.mword{position:absolute;font-family:\'Cormorant Garamond\',serif;font-weight:300;letter-spacing:.34em;text-transform:uppercase;white-space:nowrap;background:linear-gradient(95deg,#8a5a1e,#d4a060 38%,#f7e2b0 52%,#d4a060 66%,#8a5a1e);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;filter:drop-shadow(0 3px 16px rgba(212,160,96,.35));opacity:0;animation:moodWord var(--wd,9s) linear infinite;animation-delay:var(--del,0s)}' +
    '@keyframes moodWord{0%{opacity:0;transform:translate3d(-16%,0,0) scale(.94)}6%{opacity:var(--op,.92)}30%{transform:translate3d(6%,-2%,0) scale(1)}55%{transform:translate3d(24%,2%,0) scale(1.02)}85%{opacity:var(--op,.92)}100%{opacity:0;transform:translate3d(58%,-3%,0) scale(1.05)}}' +
    '.mood-auth-brand{position:absolute;left:24px;bottom:20px;z-index:5;font-family:\'Cormorant Garamond\',serif;font-weight:300;font-size:1.4rem;letter-spacing:.16em;color:#fdf6ee;text-transform:uppercase;text-shadow:0 2px 14px rgba(0,0,0,.5)}' +
    '.mood-auth-brand b{color:#e8c080;font-weight:300}' +
    '.mood-auth-tagline{position:absolute;left:24px;bottom:48px;z-index:5;font-family:\'Jost\',sans-serif;font-size:.58rem;letter-spacing:.3em;text-transform:uppercase;color:rgba(232,192,128,.8);text-shadow:0 1px 8px rgba(0,0,0,.5)}' +
    '.mood-auth-form{padding:36px 38px 30px;overflow-y:auto;background:linear-gradient(180deg,#2c1200,#1d0b00);display:flex;min-height:0}' +
    '.mood-auth-in{margin:auto 0;width:100%}' +
    '.mood-auth-form .mt{font-size:1.85rem;margin-bottom:4px}' +
    '.mood-auth-form .ms{margin-bottom:16px;color:rgba(245,230,211,.55)}' +
    '.mood-auth-form label{display:block;margin-bottom:12px;font-size:.58rem;letter-spacing:.18em;color:var(--gold,#d4a060)}' +
    '.mood-auth-form label input{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:12px 14px;background:rgba(5,2,0,.5);border:1px solid rgba(212,160,96,.22);color:var(--cream,#f5e6d3);font-family:\'Jost\',sans-serif;font-size:.88rem;outline:none;border-radius:8px}' +
    '.mood-auth-form label input:focus{border-color:var(--gold,#d4a060)}' +
    '.mood-auth-form .auth-btn{display:block;width:100%;box-sizing:border-box;margin-top:8px;padding:14px;border-radius:8px;font-size:.7rem}' +
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
      '<div class="mood-auth-words">' +
      '<span class="mword" style="top:14%;left:-4%;font-size:1.6rem;--del:0s;--wd:11s;--op:.9">Freshly Roasted</span>' +
      '<span class="mword" style="top:33%;left:38%;font-size:1.15rem;--del:2.4s;--wd:10s;--op:.75">Golden Hour</span>' +
      '<span class="mword" style="top:56%;left:-6%;font-size:1.35rem;--del:5s;--wd:12s;--op:.85">Artisan Bakes</span>' +
      '<span class="mword" style="top:78%;left:26%;font-size:1rem;--del:7.6s;--wd:10s;--op:.7">Pure Coffee</span>' +
      '</div>' +
      '<div class="mood-auth-tagline">Welcome to the ritual</div>' +
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
