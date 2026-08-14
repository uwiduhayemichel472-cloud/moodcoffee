// ─── Optional real-LLM fallback ─────────────────────
// Drop in one API key (OpenAI, Anthropic or Gemini) and free-form questions
// that don't match a built-in intent get answered by a real LLM. Keys are read
// from the environment so secrets never live in code or the database.
//
//   OPENAI_API_KEY=sk-...            -> gpt-4o-mini
//   ANTHROPIC_API_KEY=sk-ant-...     -> claude-3-5-haiku-latest
//   GEMINI_API_KEY=...               -> gemini-1.5-flash
//   LLM_MODEL=gpt-4o                 -> optional model override
const PROVIDERS = {
  openai: {
    key: () => process.env.OPENAI_API_KEY || '',
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    headers: k => ({ 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json' }),
    build: (model, sys, usr, maxTokens) => ({
      model, max_tokens: maxTokens,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }]
    }),
    parse: j => (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ''
  },
  anthropic: {
    key: () => process.env.ANTHROPIC_API_KEY || '',
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-haiku-latest',
    headers: k => ({ 'x-api-key': k, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }),
    build: (model, sys, usr, maxTokens) => ({
      model, max_tokens: maxTokens, system: sys,
      messages: [{ role: 'user', content: usr }]
    }),
    parse: j => (j.content && j.content[0] && j.content[0].text) || ''
  },
  gemini: {
    key: () => process.env.GEMINI_API_KEY || '',
    url: k => 'https://generativelanguage.googleapis.com/v1beta/models/' +
      (process.env.LLM_MODEL || 'gemini-flash-latest') + ':generateContent?key=' + k,
    model: 'gemini-flash-latest',
    headers: () => ({ 'Content-Type': 'application/json' }),
    build: (model, sys, usr) => ({
      system_instruction: { parts: [{ text: sys }] },
      contents: [{ parts: [{ text: usr }] }]
    }),
    parse: j => (j.candidates && j.candidates[0] && j.candidates[0].content) ?
      j.candidates[0].content.parts.map(p => p.text || '').join('') : ''
  }
};

function provider() {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return null;
}
function configured() { return !!provider(); }
function status() {
  const p = provider();
  if (!p) return { configured: false, provider: null, model: '' };
  return { configured: true, provider: p, model: process.env.LLM_MODEL || PROVIDERS[p].model };
}

// Ask the configured LLM to answer `user` given a `system` prompt.
// Retries transient failures (rate limits / server hiccups) with backoff,
// then throws so the caller can fall back gracefully.
async function ask({ system, user, maxTokens = 500, attempts = 3 }) {
  const p = provider();
  if (!p) throw new Error('No LLM API key configured.');
  const pr = PROVIDERS[p];
  const key = pr.key();
  const model = process.env.LLM_MODEL || pr.model;
  const url = typeof pr.url === 'function' ? pr.url(key) : pr.url;
  const body = JSON.stringify(pr.build(model, String(system || ''), String(user || ''), maxTokens));

  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { method: 'POST', headers: pr.headers(key), body });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        lastErr = new Error('LLM (' + p + ') HTTP ' + res.status + ': ' + body.slice(0, 200));
        // Retry only transient problems: 429 (rate limit) and 5xx (server hiccup).
        if (res.status !== 429 && res.status < 500) throw lastErr;
      } else {
        const j = await res.json();
        const text = pr.parse(j);
        if (!text) throw new Error('LLM (' + p + ') returned an empty reply.');
        return String(text).trim();
      }
    } catch (e) {
      // Network / DNS / socket errors are transient too -> retry them.
      if (e !== lastErr && !(e instanceof Error && !String(e.message).match(/^LLM \(/))) {
        lastErr = e;
      } else if (e !== lastErr) {
        throw e;
      }
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 600 * (i + 1)));
  }
  throw lastErr || new Error('LLM (' + p + ') failed after ' + attempts + ' attempts.');
}

module.exports = { configured, status, ask };
