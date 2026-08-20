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
    '.mood-auth-media{position:relative;overflow:hidden;background:#1a0a00;min-height:560px;display:flex;flex-direction:column}' +
    '.mood-auth-media::before{content:\'\';position:absolute;inset:-30%;z-index:1;background:radial-gradient(circle at 28% 22%,rgba(232,192,128,.22),transparent 44%),radial-gradient(circle at 78% 82%,rgba(212,160,96,.15),transparent 52%);animation:moodGold 16s ease-in-out infinite alternate;pointer-events:none}' +
    '@keyframes moodGold{0%{transform:translate3d(-5%,-3%,0) scale(1);opacity:.85}100%{transform:translate3d(5%,4%,0) scale(1.18);opacity:1}}' +
    '.mood-auth-media::after{content:\'\';position:absolute;inset:0;z-index:2;background:linear-gradient(120deg,rgba(18,7,0,.25) 35%,rgba(12,5,0,.62));pointer-events:none}' +
    '.mood-auth-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:3}' +
    '.mood-auth-shade{position:absolute;inset:0;z-index:4;background:linear-gradient(115deg,rgba(14,6,0,.15) 30%,rgba(10,4,0,.58));pointer-events:none}' +
    '.mood-auth-brand{position:absolute;left:24px;bottom:20px;z-index:5;font-family:\'Cormorant Garamond\',serif;font-weight:300;font-size:1.4rem;letter-spacing:.16em;color:#fdf6ee;text-transform:uppercase;text-shadow:0 2px 14px rgba(0,0,0,.5)}' +
    '.mood-auth-brand b{color:#e8c080;font-weight:300}' +
    '.mood-auth-tagline{position:absolute;left:24px;bottom:48px;z-index:5;font-family:\'Jost\',sans-serif;font-size:.58rem;letter-spacing:.3em;text-transform:uppercase;color:rgba(232,192,128,.8);text-shadow:0 1px 8px rgba(0,0,0,.5)}' +
    '.mood-auth-words-below{position:relative;z-index:5;overflow:hidden;margin-top:auto;background:linear-gradient(180deg,transparent,rgba(26,10,0,.95) 30%);padding:14px 0}' +
    '.mword-track{display:flex;width:max-content;animation:mwordSlide 18s linear infinite}' +
    '.mword-track:hover{animation-play-state:paused}' +
    '@keyframes mwordSlide{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}' +
    '.mword-pill{flex-shrink:0;font-family:\'Cormorant Garamond\',serif;font-weight:300;font-size:.88rem;letter-spacing:.14em;text-transform:uppercase;color:#fdf6ee;padding:7px 18px;border-radius:20px;border:1px solid rgba(212,160,96,.3);background:rgba(26,10,0,.6);backdrop-filter:blur(4px);white-space:nowrap;margin:0 6px}' +
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
      '.mood-auth-media{height:auto;min-height:0;max-height:220px}' +
      '.mood-auth-video{height:180px}' +
      '.mword-pill{font-size:.72rem;padding:5px 14px}' +
      '.mood-auth-tagline{display:none}' +
      '.mood-auth-brand{left:16px;bottom:14px;font-size:1.1rem}' +
      '.mood-auth-form{padding:24px 22px;display:block;max-height:calc(92vh - 240px)}' +
      '.mood-auth-in{margin:0}' +
      '#authBox .x{color:#fdf6ee}' +
    '}';

  var st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  /* Curated, free-license promo videos (Mixkit). Used when the admin has not
     activated a video yet, so Login / Sign-up always looks alive. */
  var FALLBACK_VIDEOS = [
    { url: 'https://assets.mixkit.co/videos/43941/43941-720.mp4', poster: 'https://assets.mixkit.co/videos/43941/43941-thumb-720-0.jpg' },
    { url: 'https://assets.mixkit.co/videos/15131/15131-720.mp4', poster: 'https://assets.mixkit.co/videos/15131/15131-thumb-720-0.jpg' },
    { url: 'https://assets.mixkit.co/videos/3573/3573-720.mp4', poster: 'https://assets.mixkit.co/videos/3573/3573-thumb-720-0.jpg' }
  ];

  window.moodAuthMediaHtml = function () {
    var pills = [
      'Freshly Roasted', 'Golden Hour', 'Artisan Bakes', 'Pure Coffee',
      'Handcrafted', 'Morning Ritual', 'Bold Flavour', 'Slow Brewed'
    ];
    var html = pills.map(function(w){ return '<span class="mword-pill">'+w+'</span>'; }).join('');
    return '<div class="mood-auth-media">' +
      '<video class="mood-auth-video" muted loop playsinline preload="metadata"></video>' +
      '<div class="mood-auth-shade"></div>' +
      '<div class="mood-auth-words-below">' +
      '<div class="mword-track">' + html + html + '</div>' +
      '</div>' +
      '<div class="mood-auth-tagline">Welcome to the ritual</div>' +
      '<div class="mood-auth-brand">MOOD<b>.</b></div>' +
      '</div>';
  };

  window.moodAuthMediaInit = function () {
    var v = document.querySelector('.mood-auth-video');
    if (!v) return;
    var tryPlay = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    var use = function (src, poster) {
      if (!src) return;
      if (poster && !v.poster) v.poster = poster;
      v.src = src;
      v.onloadeddata = tryPlay;
      v.load();
      tryPlay();
      v.addEventListener('mouseenter', tryPlay);
      v.addEventListener('mouseleave', function () { try { v.pause(); } catch (e) {} });
    };
    fetch('/api/auth-video', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.video && j.video.url) {
        use(j.video.url);
      } else {
        var f = FALLBACK_VIDEOS[Math.floor(Math.random() * FALLBACK_VIDEOS.length)];
        use(f.url, f.poster);
      }
    }).catch(function () {
      var f = FALLBACK_VIDEOS[0];
      use(f.url, f.poster);
    });
  };
})();
