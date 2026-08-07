# MOOD Coffee Shop — Complete Hosting Guide
### Understand every piece, maintain your site, and do it yourself next time

> This guide explains **why** each service exists, **how** they connect, how to
> **buy a domain**, and how to **update your website** after launch.
> For the raw first-time setup steps, see `DEPLOY.md`.

---

## 1. The Big Picture (start here)

Your system is like a restaurant that works 24/7. Four companies help run it:

| Service | What it is | Analogy |
|---|---|---|
| **Your computer** | Where the code files live and where you edit them | The kitchen where you cook |
| **GitHub** | Safe online storage + version history for your code | The recipe book stored in a safe, with every old version kept |
| **Render** | A computer in the cloud that RUNS your website and gives it a public address | The waiter who serves the food to customers |
| **TiDB Cloud** | A cloud database (like MySQL) that stores your data | The fridge/storeroom where products, orders & customers are kept |
| **Flutterwave** | Handles online payments (MTN MoMo, Airtel, cards) | The cashier who takes money from customers |

**How they connect (one direction):**

```
You edit code on your computer
        │  git push
        ▼
GitHub (online code storage)
        │  Render watches this repo
        ▼
Render (runs your site at https://moodcoffee.onrender.com)
        │  reads & writes data
        ▼
TiDB Cloud (your products, orders, customers)
        ▲
        │  payment keys + confirmation
Flutterwave (takes customer payments)
```

A customer's journey: they open your Render URL → your code loads the page →
they order → the order is saved in TiDB → they pay on Flutterwave's page →
Flutterwave tells your site "paid" (webhook) → order becomes active.

**Important:** none of these services knows about the others on its own.
They connect through two things:
1. **GitHub ↔ Render** — you grant Render permission to read your GitHub repo.
2. **Render ↔ TiDB** — Render holds your database's address + password in
   "Environment Variables" and uses them to connect.

---

## 2. What each service is, deeply

### GitHub — your code's home & history
- **What it does:** stores a copy of your whole project online. Every time you
  "commit", GitHub saves a permanent snapshot. If you ever break something, you
  can roll back to any old snapshot.
- **Why we need it:** Render cannot see your computer. GitHub is the bridge —
  Render pulls your code from GitHub whenever you update it.
- **Your repo:** `https://github.com/uwiduhayemichel472-cloud/moodcoffee`
- **Secret protection:** `.env` (your passwords/keys) is blocked from GitHub by
  `.gitignore`, so your secrets never leak.

### TiDB Cloud — your database (free, MySQL-compatible)
- **What it does:** stores all your business data: products, categories, orders,
  customers, reviews, gift cards, reservations, admin accounts, settings.
- **Why separate:** your website code and your data are different things. The
  data must survive restarts and be reachable from anywhere, so it lives on a
  dedicated database server in the cloud.
- **Your database:** cluster `moodcoffee`, host
  `gateway01.eu-central-1.prod.aws.tidbcloud.com`, port `4000`, database `moodcoffee`.
- **Login info:** username `4VfRZbJqeXWmqui.root` + the password you generated.
  You can always see/recreate them in TiDB Cloud → your cluster → **Connect**.

### Render — the computer that runs your site
- **What it does:** takes your code from GitHub, installs dependencies
  (`npm install`), starts the app (`npm start`), and serves it at a public URL
  with free HTTPS. It keeps your site alive and **auto-redeploys** every time you
  push new code to GitHub.
- **Your site URL:** `https://moodcoffee.onrender.com`
- **Environment Variables:** the panel where Render stores your database
  connection and payment keys. Your code reads them from there — never hardcoded.
- **Free tier limits:** spins down after 15 min without visitors (wakes in ~30s),
  512 MB RAM. Great for now; upgrade to a paid instance later for always-on.

### Flutterwave — payments
- **What it does:** processes MTN MoMo, Airtel Money and card payments using the
  **v4** API. Your app creates a charge; the customer approves it on Flutterwave's
  page or on their phone; Flutterwave confirms back to your app (webhook).
- **Why you needed a website first:** to get **live** keys, Flutterwave requires
  your real, public website URL for merchant verification. Your Render URL
  (`https://moodcoffee.onrender.com`) satisfies this.
- **Keys:** v4 needs **Client ID**, **Client Secret** and **Encryption Key**
  (Settings → API on the Flutterwave dashboard). They live in Environment
  Variables on Render and in your local `.env`.

---

## 3. Recap — the exact steps we did (and why each mattered)

| # | Step | What it actually did |
|---|---|---|
| 1 | Installed Git | Gave your computer the tool to save & send code |
| 2 | `git init` + first commit | Created the project's version history on your PC |
| 3 | Created GitHub repo `moodcoffee` | Made an empty online folder to receive your code |
| 4 | `git push` | Sent all your code to GitHub |
| 5 | Created TiDB Cloud cluster (Serverless) | Made your free online database |
| 6 | Ran `node --env-file=.env.cloud setup.js` | Built all your tables (products, orders…) and loaded seed data into TiDB |
| 7 | Created Render account (email) + Web Service | Set up the cloud computer that hosts your site |
| 8 | Added Environment Variables on Render | Gave your site the database address + password + payment keys |
| 9 | Deploy → "Live" | Your website went online at `https://moodcoffee.onrender.com` |
| 10 | Create Admin on `/admin` | Set up your staff login for the control panel |

---

## 4. Buying and connecting your own domain (e.g. `moodcoffee.com`)

You do **not** need a domain to run your business — the `onrender.com` URL works
for customers and for Flutterwave. But a custom domain looks more professional.
Render's free plan supports custom domains, so this is optional and cheap.

### Step A — Buy the domain (registrar)
1. Choose a registrar (company that sells domain names). Recommended:
   - **Namecheap** — https://www.namecheap.com (`.com` ≈ $10–12/year, cheapest, good support)
   - **GoDaddy** — https://www.godaddy.com (familiar, slightly pricier)
   - For a **Rwanda** address (`.rw`), use a local/accredited registrar such as
     through Rwanda's RDB-approved registrars.
2. Search for your name (e.g. `moodcoffee.com`). If taken, try `moodcoffee.rw`,
   `moodcoffee.co.rw`, or `shopmoodcoffee.com`.
3. Add to cart → **Checkout**. You'll create an account and pay with card/PayPal
   (or local mobile money where supported).
4. Registration takes minutes. You'll get access to a **DNS management** page
   for the domain. Keep the registrar's login safe — you need it to renew.

### Step B — Connect it to Render
1. Open **Render dashboard** → your web service (`moodcoffee`) → **Settings**.
2. Scroll to **Custom Domains** → click **Add Custom Domain** → type `moodcoffee.com` (and later add `www.moodcoffee.com`).
3. Render shows you the records to create at your registrar:
   - A **CNAME** record: `www` → `moodcoffee.onrender.com`
   - An **A/ALIAS** record: `@` → Render's shown IP/host, and/or a verification **TXT** record.
4. Go to your registrar's **DNS settings**, add those records exactly, save.
5. Wait a few minutes, then back on Render click **Verify**. Render then
   automatically issues a free **HTTPS certificate** for your domain.
6. **Last step (very important):** in Render → Environment Variables, change
   `BASE_URL` to `https://moodcoffee.com` → click **Save** (this triggers a redeploy).
   Now after customers pay, they return to your real domain.

> Always keep your `onrender.com` URL working too — Render keeps both live.

---

## 5. How to change features and update your live website

**Yes — you can edit anything, anytime.** The flow is always the same:

```
1. Edit files (on your computer)     → 3. Commit (save a snapshot)
2. Test locally (optional but smart) → 4. Push (send to GitHub)
                                      → 5. Render auto-redeploys → site updated
```

### Option A — Recommended: edit on your computer
1. Open your project folder (the same `bagabo` folder).
   - Any text editor works (Notepad is okay for small edits; **VS Code** is best:
     https://code.visualstudio.com — free).
2. Make your changes (e.g. edit a price in a file, change colors in
   `public/shop.css`, change a message in `public/shop.js`).
3. **Preview first (recommended):** start XAMPP (MySQL) and run:
   ```
   npm start
   ```
   then open `http://localhost:3000`. If it works here, it will work online.
4. Save your work to GitHub by running these three commands in the project folder:
   ```
   git add .
   git commit -m "what I changed"
   git push
   ```
5. Wait ~1–3 minutes. Render automatically rebuilds and your live site updates.
   Refresh your website to see the change.

> Tip: many settings (products, prices, banners, promo codes) don't need code
> edits at all — change them from **your admin panel** at `/admin`. Only new
> *features* need code changes.

### Option B — Quick fixes straight from GitHub (no computer setup)
1. Open your repo on GitHub → click a file (e.g. `public/shop.js`).
2. Click the **pencil icon** (top-right) → edit → scroll down → **Commit changes**.
3. Render auto-deploys the same way.

### If you break something
- **Git:** run `git log` to see old versions, or `git push` after `git revert`.
- **Render:** Dashboard → your service → **Deploys** → choose the previous deploy
  → **Rollback** (free plan keeps the last two).

---

## 6. Do-it-yourself checklist (next time)

If you ever rebuild or switch accounts, here is the exact order:

1. **Install Git** — `winget install --id Git.Git -e --source winget --silent`
2. **Push code** to a GitHub repo (see `DEPLOY.md` Part 1).
3. **Create TiDB Cloud** Serverless cluster → copy Host/Port/User/Password.
4. **Create tables:** make a `.env.cloud` file with the DB values, run
   `node --env-file=.env.cloud setup.js`, then **delete `.env.cloud`**.
5. **Create Render** Web Service from your GitHub repo → set Environment Variables:
   - `DB_HOST`, `DB_PORT` (4000), `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_SSL=1`
   - `BASE_URL=https://<your-app>.onrender.com`
   - `COOKIE_SECURE=1`
    - `FLW_CLIENT_ID`, `FLW_CLIENT_SECRET`, `FLW_ENCRYPTION_KEY`, `FLW_ENV=test`, `FLW_WEBHOOK_SECRET`
6. **Deploy**, open `/admin`, create the first admin.
7. **Flutterwave:** add webhook `https://<your-app>.onrender.com/api/pay/webhook`,
   put the webhook secret in the env vars.
8. (Optional) Buy a domain and connect it as in Section 4.

---

## 7. Quick troubleshooting

| Symptom | Fix |
|---|---|
| Site shows "Database not ready" | Check the 6 DB env vars on Render are exact (host, port 4000, user ending `.root`, password, name, `DB_SSL=1`). |
| Change doesn't appear online | Did you `git push`? Check Render → Deploys for a running build. Hard-refresh the site (Ctrl+F5). |
| Order stuck on "Pending" | Check `BASE_URL`, and that the Flutterwave webhook secret matches `FLW_WEBHOOK_SECRET`. |
| Free site is slow first time | The free instance was asleep — it wakes in ~30s. Upgrade later for always-on. |
| Forgot TiDB password | TiDB Cloud → cluster → Connect → you can reset/recreate the password. |
| Forgot admin password | Not recoverable automatically — we can reset it via the database (ask me). |

---

## 8. What costs what (today)

| Item | Cost |
|---|---|
| GitHub | Free |
| TiDB Cloud (Serverless) | Free (5 GB) |
| Render web service (free tier) | Free (750 hrs/mo) |
| Custom domain (`.com`) | ≈ $10–12 / year (optional) |
| Render paid instance (optional) | $7/month — always-on, no cold starts |
| Flutterwave | Small % per transaction (industry standard) |

---

*Your project files live in two places: your computer's `bagabo` folder (the
working copy) and GitHub (the backup). Keep both in sync with
`git add .` → `git commit` → `git push`, and Render keeps your site updated
automatically.*
