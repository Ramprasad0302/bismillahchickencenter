# Bismilla Chicken Center

Order, delivery and payment management for a chicken distribution business.
React 19 + Vite front end, Express 5 + MySQL back end, JWT auth, four roles
(admin, retailer, driver, staff).

Online payments run through Stripe today and can be switched to Razorpay with
one environment variable.

---

## First run

### 1. Rotate the credentials that were exposed

`server/.env` was committed to a public GitHub repo, so the database password
and the old JWT secret should be treated as public.

- **Database password** — change it in your Hostinger panel, then put the new
  one in `server/.env`.
- **JWT secret** — already replaced with a freshly generated one in
  `server/.env`. Everyone gets logged out when you deploy it; that's the point.
- **Stripe secret key** — the `sk_test_…` currently in `server/.env` was pasted
  into a chat window. Roll it: Stripe Dashboard → Developers → API keys → Roll
  key, then paste the new one in.

### 2. Install

```bash
cd server && npm install
cd ../client && npm install
```

`npm install` (not `npm ci`) — the lock files predate the dependency changes
and will be reconciled on install.

### 3. Set up the database

```bash
cd server
npm run db:setup           # core tables
npm run db:payments        # payment_transactions + enum updates
npm run db:migrate-ledger  # only if you have both `ledger` and `ledgers`
npm run db:reconcile       # fixes retailer balances that drifted
npm run create:admin       # prompts for a real password
```

### 4. Run

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev

# terminal 3 — only while testing payments
cd server && npm run stripe:listen
```

`stripe listen` prints a `whsec_…`. Put it in `STRIPE_WEBHOOK_SECRET` and
restart the server.

---

## Testing a payment

Log in as a retailer with at least one unpaid order, open **Payments**, and pay.

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | succeeds |
| `4000 0000 0000 0002` | declined |
| `4000 0025 0000 3155` | requires 3-D Secure |

Any future expiry, any CVC, any postcode.

---

## How payments work

```
Retailer clicks Pay
  └─ POST /api/payments/checkout
       server computes the balance from the orders table (never from the
         request body) and clamps the requested amount to it
       inserts a payment_transactions row     created → pending
       asks the gateway for a hosted page
       returns { redirect_url }
  └─ browser goes to Stripe Checkout
  └─ Stripe redirects to /retailer/payment/result?ref=TXN-…

separately, Stripe → POST /api/payments/webhook  (signed)
  └─ settleTransaction()
       allocates the amount across unpaid orders, oldest first
       updates orders.balance / paid_amount / payment_status
       inserts a `payments` row (method 'online', status 'verified')
       recalculates retailers.outstanding by summing orders.balance
       inserts a credit row into `ledger`
       marks the transaction settled
```

The result page polls `GET /api/payments/status/:reference`. If the webhook
hasn't landed, that endpoint asks Stripe directly and settles from the answer —
so the flow works even if you forget to run `stripe listen`.
`settleTransaction` locks the transaction row and checks a `settled` flag, so
the webhook and the poll racing each other is harmless, and Stripe's retries
can't double-credit an account.

### Switching to Razorpay

```bash
cd server && npm install razorpay
```

```ini
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_test_…
RAZORPAY_KEY_SECRET=…
RAZORPAY_WEBHOOK_SECRET=…
```

Nothing else changes. `server/services/gateways/razorpayGateway.js` is already
written and implements the same interface using Payment Links, which return a
hosted URL just like Stripe Checkout. Register the webhook in the Razorpay
dashboard for `payment_link.paid`, `payment_link.cancelled`,
`payment_link.expired`, `payment.failed`.

If you later want the Razorpay Checkout **modal** instead — better conversion in
India, proper UPI intent — that's the one change worth making: have
`createCheckout` return `{ orderId, keyId }` and open the modal client-side.
Worth doing once Stripe is proven end to end.

---

## Layout

```
client/
  src/
    pages/{admin,retailer,driver}/   role dashboards
    services/                        axios wrappers
    routes/                          route table + role guard
    context/AuthContext.jsx          token + user state
server/
  config/       db.js, jwt.js, payment.js
  middleware/   auth.js (authMiddleware + requireRole)
  routes/       one file per resource
  controllers/  request handling
  services/     paymentGateway.js, paymentService.js, gateways/
  scripts/      setup + migrations (legacy/ holds old one-off fixes)
database/
  schema.sql    full schema, reviewable without running Node
```

---

## API

| Method | Path | Who |
| --- | --- | --- |
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | any |
| GET | `/api/payments` | retailer (own) / admin (all) |
| GET | `/api/payments/summary` | retailer |
| POST | `/api/payments/checkout` | retailer |
| GET | `/api/payments/status/:reference` | owner or admin |
| POST | `/api/payments/webhook` | gateway, signature-verified |
| POST | `/api/retailers` | admin |
| POST | `/api/orders/payments` | admin |

Everything except login and the webhook needs `Authorization: Bearer <token>`.

---

See `CHANGELOG.md` for what changed in this pass and why.
