/* MOOD AI assistant — customer chat widget (works on every site page) */
(function () {
  if (window.__moodAiInit) return;
  window.__moodAiInit = true;

  function t(key, fallback) {
    try { return (window.I18N && I18N.t && I18N.t(key)) || fallback; } catch (e) { return fallback; }
  }

  var SUGGESTIONS = [
    t('ai_s1', "What's on the menu?"),
    t('ai_s2', 'Delivery time & fees?'),
    t('ai_s3', 'How do loyalty points work?'),
    t('ai_s4', 'Where are you located?')
  ];

  var msgs = [];
  var busy = false;

  var btn = document.createElement('button');
  btn.className = 'mood-ai-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Ask MOOD assistant');
  btn.innerHTML = '💬<span class="pulse"></span>';

  var panel = document.createElement('div');
  panel.className = 'mood-ai';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'MOOD assistant');
  panel.innerHTML =
    '<div class="mood-ai-hd"><span class="ico">☕</span><div><b>' + t('ai_title', 'MOOD Assistant') + '</b><span class="st"><i></i>' + t('ai_sub', 'Ask me anything about MOOD') + '</span></div>' +
    '<button class="mood-ai-x" type="button" aria-label="Close">×</button></div>' +
    '<div class="mood-ai-msgs"></div>' +
    '<div class="mood-ai-sug"></div>' +
    '<div class="mood-ai-in"><input type="text" placeholder="' + t('ai_ph', 'Ask me… e.g. how much is the Latte?') + '"><button type="button" aria-label="Send">➤</button></div>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var box = panel.querySelector('.mood-ai-msgs');
  var sug = panel.querySelector('.mood-ai-sug');
  var inp = panel.querySelector('input');
  var sendBtn = panel.querySelector('.mood-ai-in button');

  function bubble(from, text, typing) {
    var d = document.createElement('div');
    d.className = 'mood-ai-m' + (from === 'me' ? ' me' : '');
    if (from !== 'me') {
      var a = document.createElement('div');
      a.className = 'mav';
      a.textContent = '☕';
      d.appendChild(a);
    }
    var b = document.createElement('div');
    b.className = 'mood-ai-t' + (typing ? ' typing' : '');
    if (typing) { b.innerHTML = '<i></i><i></i><i></i>'; } else { b.textContent = text; }
    d.appendChild(b);
    return d;
  }
  function addMsg(from, text, typing) {
    msgs.push({ from: from, text: text });
    box.appendChild(bubble(from, text, typing));
    box.scrollTop = box.scrollHeight;
    renderSugs();
  }
  function renderSugs() {
    if (!panel.classList.contains('open')) return;
    sug.innerHTML = '';
    if (msgs.length > 1 || busy) return; // hide once the conversation has started
    SUGGESTIONS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = s;
      b.addEventListener('click', function () { inp.value = s; send(); });
      sug.appendChild(b);
    });
  }
  function open() {
    if (!msgs.length) addMsg('ai', t('ai_welcome', 'Hi! I can help you with the menu, prices, delivery, loyalty, gift cards and more. What would you like to know? ☕'));
    panel.classList.add('open');
    btn.style.display = 'none';
    renderSugs();
    setTimeout(function () { inp.focus(); }, 120);
  }
  function close() {
    panel.classList.remove('open');
    btn.style.display = 'flex';
  }
  function send() {
    var text = inp.value.trim();
    if (!text || busy) return;
    addMsg('me', text);
    inp.value = '';
    busy = true;
    sendBtn.disabled = true;
    renderSugs();
    var typingBubble = bubble('ai', '', true);
    box.appendChild(typingBubble);
    box.scrollTop = box.scrollHeight;
    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (typingBubble.remove) typingBubble.remove();
      addMsg('ai', j.answer || t('ai_err', 'Sorry, I had a problem answering that.'));
    }).catch(function () {
      if (typingBubble.remove) typingBubble.remove();
      addMsg('ai', t('ai_offline', 'Sorry, I could not reach the server right now. Try again in a moment.'));
    }).then(function () {
      busy = false;
      sendBtn.disabled = false;
    });
  }

  btn.addEventListener('click', open);
  panel.querySelector('.mood-ai-x').addEventListener('click', close);
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
  sendBtn.addEventListener('click', send);

  document.addEventListener('i18n:changed', function () {
    renderSugs();
  });

  renderSugs();
})();
