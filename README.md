# MOOD Coffee Shop & Bakery

An online ordering system with a customer storefront (`/shop`), a landing page (`/`), and a
private admin panel (`/admin`). Customers create accounts, order coffee and fresh bread, pay
online (Flutterwave), and can use **promo codes**, **gift cards**, **loyalty rewards** and
**loyalty points** at checkout.

> Other docs: [DEPLOY.md](DEPLOY.md) = hosting + payments setup · [HOSTING-GUIDE.md](HOSTING-GUIDE.md)

---

# 1. Promo Codes

## 1.1 What they are
 
A promo code gives the customer a **percentage discount** on their order. Codes are created by
MOOD (the admin) and can be used by **any** customer, **unlimited times**, until you delete them.

- One code = one percentage (e.g. `WELCOME` = `10` → 10% off).
- Codes are **not case-sensitive** at checkout and are stored in uppercase.
- There is **no expiry date, no minimum spend, and no per-customer limit** in the current version.
  A code stays active until you delete it.

## 1.2 MOOD side (the business)

Where: **Admin panel → Promo Codes** (`/admin` → menu → **Promo Codes**).

| Action | How |
|---|---|
| Create a code | Click **+ Add promo code**, enter the code name (e.g. `WELCOME`) and the discount **percent** (e.g. `10`), save. |
| See all codes | The page shows every code as a chip with its discount %, e.g. `WELCOME · 10% off`. |
| Delete a code | Click the `×` on the chip and confirm. Deleted codes stop working immediately. |
| See who used it | Not tracked per-customer in the current version — but every order that used a code is stored: open **Orders** → the order row shows the **discount** amount it received. |

**How the discount is applied (behind the scenes):** when a customer places an order, the server
re-checks the code in the database (it never trusts the browser), and computes
`discount = order subtotal × percent ÷ 100`. The customer pays `subtotal − discount`, then
delivery fee is added on top (see section 4).

> Idea: give each new customer `WELCOME10` (10% off first order). Since there is no usage limit,
> remember to delete it once your welcome campaign ends.

## 1.3 Customer side

1. Customer adds items to the cart and opens **Checkout**.
2. In the **Promo Code (optional)** box they type the code, e.g. `welcome` and click apply.
3. The shop calls the server, which looks the code up. If valid, a green **"✓ 10% discount applied!"**
   message appears and the order total drops by the percentage.
4. If the code is wrong/unknown, a red **"Invalid promo code."** message appears and nothing changes.
5. The discount is shown in the checkout summary before paying.

---

# 2. Gift Cards

## 2.1 What they are

A gift card is a code with a **money balance** (e.g. a 20.00 card). Anyone with the code can use it
at checkout to pay for part or all of an order. The balance is tracked, so a card can be used again
and again **until the balance runs out**.

Two ways a gift card is born:
1. **A customer buys one** in the shop (self-service), and
2. **MOOD creates one** in the admin panel.

Code format: `MOOD-XXXX-XXXX` (admin-created) or `MOOD-XXXX-XXXX-XXXX` (customer-purchased) —
generated automatically, never chosen by hand.

## 2.2 MOOD side (the business)

Where: **Admin panel → Gift Cards**.

| Action | How |
|---|---|
| Create a gift card | Click **+ Create gift card**, enter the **value** (1–500) plus the buyer's **name** and **email** (both required), save. The code is generated for you and shown in the table. |
| See all cards | The table shows **Code, Buyer, Value, Balance, Status, Created**. |
| Disable a card | Click the **Active / Disabled** badge to toggle it. A disabled card is rejected at checkout. |
| Delete a card | Click **Delete** and confirm. Deleted cards stop working immediately. |

Every order that used a gift card is recorded — open **Orders** → the order shows the **gift code**
and the **gift amount** deducted.

> The balance shown in the admin table is the **remaining** balance, not the original value.

## 2.3 Customer side

**Buying a gift card:** in the customer account area (Account → Gift cards), the customer:

1. Picks an **amount** (1–500, in the store currency).
2. Optionally adds a **recipient name**, **recipient email** and a **message**.
3. Pays nothing extra in the current version — the card is created immediately (rate-limited to
   5 per minute per IP).
4. The card's code is **emailed to the recipient** (if an email was given) with a nice
   "You received a MOOD gift card!" design. If no recipient email was given, it is sent to the
   buyer's own email instead.
5. The buyer can also see their purchased cards in **Account → Gift cards** (code + remaining balance).

**Using a gift card:** at checkout, in the **Gift card / reward** box, the customer enters the code
and applies it. The shop shows the code and its remaining balance. When they place the order:

- The server deducts the used amount from the card's balance.
- A card can pay for **part** of an order (the rest is paid by promo, points, cash/online).
- When the balance reaches 0, the card is automatically marked used/disabled.

---

# 3. Loyalty Rewards & Points (how they connect to gift cards)

Customers earn **points** on every order, and points can be spent two ways:

| Thing | How it works |
|---|---|
| Points as payment | 1 point = a fixed money value (set in **Admin → Settings → Loyalty**, default 1 point = 0.01). At checkout the customer can type how many points to spend; the server only allows up to their balance and what the order allows. |
| Rewards (the "stamp card") | When a customer's points reach the **threshold** (default 100 points), the system automatically mints a **free reward code** — e.g. `FREE-K7QW-3P2A` — worth `threshold × point value` (default 100 × 0.01 = 1.00). The reward appears in the customer's **Account → Rewards**, and a "🎉 Free Coffee unlocked!" message is shown right after their order. |
| Redeeming a reward | A reward code is redeemed **exactly like a gift card** — the customer types it in the **Gift card / reward** box at checkout. The difference: a reward is **tied to the account** that earned it (it only works for them) and is **single-use** (used once, gone). |

Rewards alternate between "Free Coffee on MOOD ☕" and "Free Pastry on MOOD 🥐".

> For admins: reward codes are **not** shown in the admin Gift Cards page (they belong to
> customers). Customers see them in **Account → Rewards** and on the order-confirmation screen.

---

# 4. Order of discounts at checkout (so nothing surprises you)

The final amount is computed in this exact order on the server:

```
subtotal            = sum of items (prices re-checked against the database)
− promo discount    = subtotal × promo% ÷ 100      (if a valid promo code)
− gift / reward     = up to the card's balance      (if a valid gift/reward code)
− points            = points spent × point value    (if the customer spends points)
+ delivery fee      = fee (free above the free-delivery threshold, if set)
= total the customer pays
```

Promo, gift and points can all be combined in one order. If no payment gateway is configured the
order is accepted directly (demo mode); with Flutterwave keys set, the customer pays the exact
`total` shown at checkout.

---

# 5. Moving everything to MOOD Coffee's emails (handover checklist)

Right now the site runs on **accounts created with your personal email** (GitHub, Render, TiDB,
Flutterwave, Google, Gmail/SMTP). When you hand the business over to MOOD Coffee, do the checklist
below. **Important: changing account emails never breaks the live website** — the site reads its
whole configuration from environment variables (Render) and the database (TiDB). What you are
really transferring is: (a) who can log into the dashboards, (b) which email the site sends
business mail from, and (c) refreshed secret keys.

## 5.1 The simple order to do it in

1. Add MOOD people as **admins** in the app itself (so they can run the shop immediately).
2. Transfer **dashboards** (GitHub, Render, TiDB, Flutterwave, Google Cloud).
3. Switch the **SMTP / sender email** to MOOD's own email address.
4. **Rotate the secret keys** (so your personal-email access can no longer be used).

## 5.2 Account-by-account

| Service | Log in at | What to do when MOOD has its own email |
|---|---|---|
| **GitHub** (holds the code) | github.com | Transfer the `moodcoffee` repo to MOOD's GitHub account: **Repo → Settings → Danger Zone → Transfer ownership**. Or add MOOD's account as a **Collaborator**. The site is unaffected — Render just reads the repo. |
| **Render** (hosts the live site) | render.com | Move the account: **Settings → Teams → invite** MOOD's email, then transfer the web service. *Or* register a new Render account with the MOOD email and re-create the service from the MOOD-owned repo, re-entering the same **Environment Variables** (section 5.3). |
| **TiDB Cloud** (the database) | tidbcloud.com | Change the account email (**Account / Profile**) or invite MOOD as a **project member** with admin rights. The database keeps working as long as the host/port/user/pass in the env vars stay valid. |
| **Flutterwave** (payments) | dashboard.flutterwave.com | Add MOOD as a **team member** (Flutterwave → Settings → Team) or contact Flutterwave support to change the account email. Live keys also require MOOD's business documents — see DEPLOY.md Part 4. |
| **Google Cloud Console** (Google sign-in button) | console.cloud.google.com | Add MOOD's Google account as **IAM → Owner** of the project, then remove the personal account. The OAuth client ID/secret **keep working** (the callback URL never changes). Also update the **OAuth consent screen** → "Developer contact" to MOOD's email. |
| **Domain (later)** | your registrar | Register `moodcoffee.rw` (or similar) under MOOD's name and keep the DNS login with MOOD. Point it to Render under **Settings → Custom Domain**. |

## 5.3 The environment variables that must always match

These live in **two places** and both must be kept identical — the local `.env` file and
**Render → your service → Environment**. If you recreate the Render service, re-enter all of them:

| Variable | Where to find the value |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_SSL` | TiDB Cloud → cluster → **Connect** |
| `BASE_URL` | `https://moodcoffee.onrender.com` (must match your real URL) |
| `COOKIE_SECURE` | `1` on Render (HTTPS) |
| `FLW_CLIENT_ID`, `FLW_CLIENT_SECRET`, `FLW_ENCRYPTION_KEY`, `FLW_ENV`, `FLW_WEBHOOK_SECRET` | Flutterwave → Settings → API + Webhooks |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google Cloud → Credentials (redirect URI = `https://<your-site>/api/auth/google/callback`) |

## 5.4 Emails the business sends

| Email | Set where | What to change for MOOD |
|---|---|---|
| **Order confirmation** to customers | **Admin → Settings → Email (SMTP)** (or `SMTP_*` in env) | Replace the personal Gmail app-password with MOOD's mailbox. E.g. Google Workspace or Zoho mailbox for `orders@moodcoffee.rw` → **host** `smtp.gmail.com` (or your provider's), **port** 465, **user/pass** = the MOOD mailbox + an **App Password**, **from** = `MOOD Coffee <orders@moodcoffee.rw>`. |
| **Gift card delivery** to recipients | Same SMTP settings above | Nothing extra — it uses the same SMTP. |
| **Shop contact email** shown on the site | **Admin → Settings → General** → Email field | Set to `hello@moodcoffee.rw`. |
| **Admin logins** | **Admin → Team & Admins** | Add MOOD staff as admins/superadmins; after they log in and confirm, you can remove the personal-email admin. (Only a superadmin can manage admins, and the system prevents deleting the last superadmin.) |

## 5.5 Rotate the secrets after the handover (recommended)

Once MOOD is fully in charge, generate fresh keys so the personal-email accounts can no longer be
used even if they're still on some old device:

1. **Google**: console.cloud.google.com → Credentials → your OAuth client → **Reset secret** → copy the new value → update `GOOGLE_CLIENT_SECRET` in `.env` **and** on Render.
2. **Flutterwave**: Settings → API → regenerate keys → update the three `FLW_*` vars in both places (keep `FLW_WEBHOOK_SECRET` in sync with the webhook hash).
3. **SMTP**: change the MOOD mailbox password and generate a new App Password → update Admin → Settings → Email.
4. **TiDB**: change the database password → update `DB_PASS` in both places.

> After rotating, test one real order (payment + order-confirmation email + a gift card purchase)
> before telling MOOD it's done.

---

# 6. Quick reference: where things live

| Thing | Customer sees it at | MOOD manages it at |
|---|---|---|
| Promo codes | Checkout → "Promo Code (optional)" | Admin → **Promo Codes** |
| Gift cards | Checkout → "Gift card / reward" · Account → Gift cards | Admin → **Gift Cards** |
| Loyalty rewards | Account → Rewards · order-confirmation screen | Automatic (Admin → Settings → Loyalty) |
| Loyalty points | Account · Checkout "use points" | Automatic (Admin → Settings → Loyalty) |
| Order discount totals | Order confirmation / account order history | Admin → **Orders** (discount, gift code, gift amount, points) |
