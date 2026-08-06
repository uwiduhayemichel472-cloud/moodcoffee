// ─── Central config ────────────────────────────────
module.exports = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'moodcoffee',
    // Set DB_SSL=1 for cloud MySQL (TiDB Cloud / Aiven require TLS)
    ssl: process.env.DB_SSL === '1' ? { rejectUnauthorized: false } : undefined
  },
  // Session lifetime (7 days)
  sessTTL: 7 * 24 * 60 * 60 * 1000,
  cookies: {
    customer: 'mood_sess',
    admin: 'mood_asess',
    httpOnly: true,
    sameSite: 'Lax',
    // Set to true in production over HTTPS
    secure: process.env.COOKIE_SECURE === '1'
  },
  // Outgoing email (SMTP). You can set these here OR, better, in the
  // Admin panel → Settings → Email (SMTP) so you don't need a restart.
  // The admin panel values override these whenever they are filled in.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === '0' ? false : true, // true = SSL (465), false = STARTTLS (587)
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '' // "from" address shown to recipients
  },
  // Online payments via Flutterwave v4 (MTN MoMo, Airtel Money, cards).
  // v4 uses OAuth2: get Client ID + Client Secret (+ Encryption Key for
  // cards) from Flutterwave dashboard → Settings → API. Set them as
  // environment variables so the secrets are never in code or the DB.
  gateway: {
    flutterwave: {
      clientId: process.env.FLW_CLIENT_ID || '',
      clientSecret: process.env.FLW_CLIENT_SECRET || '',
      // AES-256 key used in the browser to encrypt card details before they
      // leave the customer's device (shown in the dashboard next to the keys).
      encryptionKey: process.env.FLW_ENCRYPTION_KEY || '',
      // Webhook secret hash — set it in Flutterwave → Settings → Webhooks and
      // paste the same value here. Used to verify payment callbacks.
      webhookSecret: process.env.FLW_WEBHOOK_SECRET || '',
      // 'test' = Flutterwave sandbox (no real money). 'live' = real payments.
      env: process.env.FLW_ENV || 'test',
      // Public base URL of the site (used to build the return URL after
      // payment). Example: https://moodcoffee.rw
      baseUrl: process.env.BASE_URL || 'http://localhost:3000'
    }
  }
};
