# Deploying MOOD Coffee Shop & Bakery — Render + TiDB Cloud

This guide takes the app from your computer to a live public website, then connects
real Flutterwave payments. It is **free** for now; you can upgrade to paid plans later.

What you will end up with:
- Live site: `https://<your-app-name>.onrender.com` (HTTPS, public — this is the URL Flutterwave needs)
- Free MySQL-compatible database on TiDB Cloud
- Real (test, then live) online payments via Flutterwave

You need: a GitHub account, a Flutterwave account, and Node.js 22+ installed locally.

---

## Part 1 — Push the code to GitHub

1. Install GitHub Desktop or use git (this project is not a git repo yet).
2. In the project folder run:

   ```
   git init
   git add .
   git commit -m "MOOD Coffee Shop & Bakery"
   ```

3. Create an empty repo on https://github.com (name it e.g. `moodcoffee`) and push:

   ```
   git remote add origin https://github.com/<your-username>/moodcoffee.git
   git branch -M main
   git push -u origin main
   ```

   Note: `.env`, `node_modules/` are already excluded via `.gitignore` — your secret keys stay local.

---

## Part 2 — Create the free database (TiDB Cloud)

1. Sign up at **https://tidbcloud.com** (free, no card).
2. Create a new cluster → choose **Serverless Tier** (free, 5GB) → pick a region close to you
   (e.g. `ap-southeast-1` Singapore or `eu-central-1`) → create.
3. Open the cluster → **Connect** tab → copy the connection parameters. You need four values:

   | Parameter | Looks like |
   |---|---|
   | Host | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
   | Port | `4000` |
   | Username | `2aBcDeFg.root` (a generated prefix + `.root`) |
   | Password | a generated password (shown once — save it) |
   | Database | create one called `moodcoffee` |

4. Create the database and tables by running the app's setup script against TiDB Cloud.

   Copy your local `.env` to `.env.cloud` and fill in ONLY the DB values:

   ```
   DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
   DB_PORT=4000
   DB_USER=2aBcDeFg.root
   DB_PASS=your-generated-password
   DB_NAME=moodcoffee
   DB_SSL=1
   ```

   Then run (from the project folder):

   ```
   node --env-file=.env.cloud setup.js
   ```

   You should see `OK: database "moodcoffee" is ready.`

5. Delete `.env.cloud` when done (it holds your password). Never commit it.

---

## Part 3 — Deploy the app on Render (free)

1. Sign up at **https://render.com** (use the GitHub login).
2. Dashboard → **New → Web Service** → pick your `moodcoffee` repo.
3. Fill in:
   - **Name**: `moodcoffee` (this becomes part of your URL)
   - **Region**: nearest to you
   - **Instance Type**: `Free` (512MB RAM)
   - Build command stays `npm install`
   - Start command stays `npm start`
4. Click **Advanced** → **Environment Variables** and add ALL of these:

   ```
   DB_HOST       = gateway01.ap-southeast-1.prod.aws.tidbcloud.com
   DB_PORT       = 4000
   DB_USER       = 2aBcDeFg.root
   DB_PASS       = your-generated-password
   DB_NAME       = moodcoffee
   DB_SSL        = 1
   BASE_URL      = https://moodcoffee.onrender.com   ← replace with YOUR url
   COOKIE_SECURE = 1
   FLW_SECRET_KEY   = FLWSECK_TEST-xxxx
   FLW_PUBLIC_KEY   = FLWPUBK_TEST-xxxx
   FLW_WEBHOOK_SECRET = 
   ```

   > Do **not** set `PORT` — Render supplies it automatically and the app already reads it.
   > The `engines` field in `package.json` makes Render use Node 22+, which the app needs.

5. Click **Create Web Service**. Deploy takes ~3–5 minutes.
6. When the deploy shows **Live**, open `https://<your-app>.onrender.com` — you should see
   the MOOD landing page.
7. Open `https://<your-app>.onrender.com/admin` and create the first admin account
   (name, email, password).

**Free-tier caveat:** the free instance sleeps after ~15 minutes with no visitors and takes
~30–60s to wake on the next request. Fine for testing and for Flutterwave's requirements.
When you're ready to pay, upgrade to a paid instance (or "always-on") to keep it instant.

---

## Part 4 — Flutterwave payments

### 4.1 Test payments (works immediately)

1. Go to **https://dashboard.flutterwave.com → Settings → API** and copy your **test keys**
   (they start with `FLWSECK_TEST-` and `FLWPUBK_TEST-`).
2. Put them in the Render environment variables (and your local `.env`).
3. Place an order on the live site. You'll be sent to the Flutterwave hosted page.
4. Pay with a **test card**: `4188 8888 8888 8888`, expiry any future date, CVV any 3 digits,
   PIN `1234`. For OTP, Flutterwave test payments auto-approve in test mode.
5. After payment you return to the shop → **"Order Confirmed"**. The order also moves to
   `Preparing` in the admin panel.

> When no keys are set, orders skip the gateway and are accepted directly (demo mode).
> As soon as a key is present, **every** order goes through real payment — that switch is automatic.

### 4.2 Live payments (the real thing)

To get **live** keys Flutterwave requires a verified merchant account, which needs:

- Your **live website URL** → `https://<your-app>.onrender.com` (that's why we hosted first)
- Your business/registration documents and bank details

Steps:

1. In Flutterwave dashboard complete **Settings → Merchant Verification** with your URL and docs.
2. When approved, copy the **live keys** from Settings → API.
3. Update the keys on Render (and `.env` locally). Your first live transaction is charged for real.

### 4.3 Webhook (so orders confirm even if the customer closes the tab)

1. Flutterwave dashboard → **Settings → Webhooks**.
2. Add URL: `https://<your-app>.onrender.com/api/pay/webhook`
3. Set a **Secret Hash** of your choice, and put the same value into `FLW_WEBHOOK_SECRET`
   on Render and in `.env`.

---

## Part 5 — Emails (order confirmations)

Order confirmations are sent by the app via SMTP. Without it, customers still see the
"Order Confirmed" screen and orders still appear in admin — they just get no email.

Easiest: use your Gmail (enable 2-step verification → create an **App Password**), then in
**Admin → Settings → Email (SMTP)** set:
`host smtp.gmail.com, port 465, user you@gmail.com, pass your-app-password`.

---

## Important settings to double-check

- **Admin → Settings → Currency** must match what you charge in. In Rwanda use **RWF**
  (MTN MoMo / Airtel Money work with RWF). If your Flutterwave account is USD, card payments
  work but mobile money needs an account/currency that supports it.
- **BASE_URL** must be the exact `https://<your-app>.onrender.com` — it builds the
  "return after payment" link. If it's wrong, the customer is sent to `localhost` after paying.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Site loads but shows "Database not ready" | DB env vars wrong; re-check host/port/user/pass on TiDB. Confirm DB was created (`node --env-file=.env.cloud setup.js` said OK). |
| Can't connect to TiDB | Did you set `DB_SSL=1`? Port must be `4000`. |
| Order stuck on "Pending" forever | Webhook or verify URL problem. Check `BASE_URL`, and confirm the webhook Secret Hash matches `FLW_WEBHOOK_SECRET`. Also open the Flutterwave dashboard → Transactions to see the transaction ID. |
| Payment fails on the hosted page | You may be using a test key with a live-like flow, or currency mismatch. Use the test card above in test mode. |
| Site very slow first load | Free Render instance is waking from sleep — upgrade to paid when ready. |

---

## When you're ready to pay (optional upgrades)

- **Render** web service → paid instance (~$7/mo) = always-on, no cold starts, custom domain.
- Keep TiDB Cloud free tier (it stays free within generous limits) or upgrade for more storage.
- Optional: point your own domain (e.g. `moodcoffee.rw`) to the Render service under
  **Settings → Custom Domain**.
