# What changed

Two things happened in this pass: the Stripe payment gateway went in, and the
bugs found while reading the code got fixed. The money-related ones are listed
first because several were breaking things in production right now.

---

## Money bugs

### 1. Admin payments were failing silently — `ledgers` vs `ledger`

`scripts/createTables.js` creates a table called **`ledger`**.
`setupDatabase.js` creates one called **`ledgers`**. `recordPayment` and
`routes/ledgers.routes.js` both inserted into `ledgers`. Depending on which
setup script had been run, the insert either hit a table nothing else read or
threw and rolled back the whole payment — including the order updates that had
already been applied in the same transaction.

**Fixed:** everything uses `ledger` now, overridable via `LEDGER_TABLE`.
`setupDatabase.js` creates the right name and warns if the old one is present.
`scripts/migrateLedger.js` folds legacy rows into `ledger` and renames the old
table to `ledgers_backup` — nothing is deleted.

### 2. `retailers.outstanding` drifted permanently

The old code did `outstanding = outstanding - amount`. Any double-post,
rollback-after-partial-write, or manually edited order left the retailer's
balance permanently wrong, with no way to notice or correct it.

**Fixed:** outstanding is now recalculated as `SUM(orders.balance)` for that
retailer after every change. `createOrder` does the same when a new bill is
raised, so the figure is derived rather than accumulated.

### 3. Paid orders still showed as pending

Neither `recordPayment` nor the ledger route ever touched
`orders.payment_status`. A fully paid order kept reading `pending` forever.

**Fixed:** status is recomputed on every allocation — `paid` at zero balance,
`partial` when something has been paid, otherwise `pending`.

### 4. `recordPayment` crashed instead of reporting errors

`let connection;` was assigned after the validation checks, but `catch` called
`connection.rollback()` and `finally` called `connection.release()`
unconditionally. If `pool.getConnection()` failed, the real error was replaced
by "Cannot read properties of undefined".

**Fixed:** both guarded, and the rollback is wrapped so a failed rollback
doesn't mask the original error either.

### 5. Order numbers collided under load

`SELECT COUNT(*) … WHERE DATE(created_at) = CURDATE()` then `+1`. Two orders in
the same second produced the same `order_number`, and the UNIQUE constraint
made the second insert fail.

**Fixed:** reads the highest sequence already issued today and retries up to
five times on `ER_DUP_ENTRY`.

---

## Security

### 6. CORS allowed every origin

`server.js` built an allow-list, then called `callback(null, true)` in the
*else* branch too — a blocked origin was logged and then allowed. Combined with
`credentials: true`, any website could make authenticated requests against the
API using a logged-in user's browser.

**Fixed:** blocked origins are rejected. Localhost on any port is still allowed
in development so Vite can move around. Configurable via `ALLOWED_ORIGINS`.

### 7. Hardcoded JWT fallback secret

Both `authController` and `middleware/auth` fell back to
`'bismilla_chicken_center_2026_super_secret_key'` when `JWT_SECRET` was unset.
That string is in the repo's git history — anyone who read it could mint admin
tokens if the env var ever went missing in production.

**Fixed:** `config/jwt.js` throws at startup if `JWT_SECRET` is absent or
shorter than 32 characters. Failing to boot beats booting insecurely.

### 8. Secrets and tokens written to the log on every request

`middleware/auth.js` logged the JWT secret and the full bearer token on each
authenticated request. `authController` logged the secret and every freshly
issued token. `server.js` logged the whole login body, including the plaintext
password.

**Fixed:** all of it removed. The request logger redacts `password`,
`currentPassword`, `newPassword`, `token` and `authorization`, and only logs
bodies in development.

### 9. Anyone could create a retailer account

`POST /api/retailers` sat above `router.use(authMiddleware)` with a comment
reading "Admin only - but no auth here for registration". It created both a
retailer *and* a user row with a login.

**Fixed:** moved below the auth middleware and gated with `requireRole('admin')`,
along with the other admin-only retailer routes. A new `requireRole(...roles)`
helper is exported from `middleware/auth.js`.

### 10. `/api/debug-routes` published the route map

It also read `app._router`, which no longer exists in Express 5 — so it would
have thrown rather than responded.

**Fixed:** removed.

---

## Correctness and hygiene

### 11. The seeded admin could never log in

`createTables.js` inserted the literal string `$2a$10$YourHashedPasswordHere`
as the password hash. `bcrypt.compare()` can never match that.

**Fixed:** the seed only runs when `ADMIN_INITIAL_PASSWORD` is set, and hashes
it properly. `scripts/createAdmin.js` (replacing `hashPassword.js`, which
hardcoded `admin123` and silently did nothing if the row was absent) prompts for
a real password with hidden input.

### 12. `routes/ledgers.routes.js` was dead code

Never mounted in `server.js`. It queried `retailers.total_purchase`, a column
that is never created. Its `POST /payments` duplicated `recordPayment`,
including all the bugs above.

**Fixed:** deleted. The working logic lives in `recordPayment` and
`services/paymentService.js`.

### 13. `dotenv.config()` ran too late

It was called *after* the route modules were required. `config/db.js` only
worked because it calls `dotenv.config()` itself.

**Fixed:** moved to the first line of `server.js`.

### 14. `database/schema.sql` was empty

The real schema existed only inside a Node script.

**Fixed:** the full schema is written out, including the new
`payment_transactions` table and the `'online'` enum additions.

### 15. `client/src/services/api.js` hardcoded localhost

`baseURL: 'http://localhost:5000/api'` — the deployed front end would call the
user's own machine. A `VITE_API_URL` existed in `server/.env`, but Vite only
reads `.env` files inside `client/`, so it was never used.

**Fixed:** reads `import.meta.env.VITE_API_URL`. `client/.env` created.

### 16. Repository hygiene

- `node_modules/` (both copies), `server.zip`, and `server/.env` with live
  credentials were all committed. Removed from this archive; `.gitignore` added
  at the root and in `server/`.
- Root `package.json` / `package-lock.json` mixed React and MySQL dependencies
  and nothing referenced them — removed. `client/` and `server/` each have their
  own.
- `cors` was listed as a client dependency; it's server-only. Removed.
- Eight one-off debug scripts (`fixGopiRetailer.js`, `checkColumn.js`,
  `testOrderUpdate.js`, …) moved from `server/` into `server/scripts/legacy/`
  with their require paths corrected.
- `.env.example` added for both client and server.

> **Note:** removing these files here does not remove them from your GitHub
> history. Anyone can still read the old `server/.env` in an earlier commit.
> Rotating the credentials is the fix; for a repo this young, starting a fresh
> one is cleaner than rewriting history.

---

## New: payment gateway

| File | Purpose |
| --- | --- |
| `server/config/payment.js` | provider selection, currency, return URLs |
| `server/services/paymentGateway.js` | resolves the active adapter |
| `server/services/gateways/stripeGateway.js` | Stripe Checkout + webhook verification |
| `server/services/gateways/razorpayGateway.js` | same interface, ready to activate |
| `server/services/paymentService.js` | balance calculation and settlement |
| `server/controllers/paymentController.js` | checkout, status, webhook, history |
| `server/routes/payments.js` | route table |
| `server/scripts/createPaymentTables.js` | migration |
| `client/src/services/paymentService.js` | API wrapper |
| `client/src/pages/retailer/PaymentResult.jsx` | return page with status polling |

Modified: `server/server.js`, `client/src/pages/retailer/RetailerPayments.jsx`,
`client/src/routes/AppRoutes.jsx`, `client/src/services/api.js`.

Three design decisions worth knowing:

**The browser never names the amount that gets charged.** It may request *less*
than the balance for a partial payment, but the server recomputes the balance
from the `orders` table and rejects anything above it. If the charge came from
the request body, anyone could pay ₹1 against a ₹50,000 bill.

**The webhook is mounted before `express.json()`.** Signature verification
hashes the exact bytes Stripe sent; once `express.json()` parses and
re-serialises the body, every check fails. This is the most common reason a
Stripe integration "works locally but webhooks always 400".

**Settlement is idempotent.** The transaction row is locked with `FOR UPDATE`
and carries a `settled` flag, so Stripe's retries, a duplicate delivery, and
the status poll racing the webhook all resolve to exactly one credit.

Also fixed along the way: `GET /api/payments` didn't exist, and
`RetailerPayments.jsx` was calling it inside a `try/catch` that swallowed the
404 and showed an empty history table. The endpoint is now implemented —
retailers see their own payments, admins see all.

---

## Verified

Run offline against mocked infrastructure:

- 22 assertions across the payment flow — allocation across multiple bills
  oldest-first, partial payments, over-payment rejection, webhook signature
  rejection, replay idempotency, poll-based settlement, cross-retailer access
  denial. All pass.
- Server boots; CORS rejects unknown origins (403) and accepts known ones (200);
  unauthenticated requests get 401; a retailer token on an admin route gets 403;
  `/api/debug-routes` is gone (404); a valid webhook signature returns 200 and
  an invalid one 400, which also confirms the raw body survives the middleware
  stack.
- No secret, token, or plaintext password appears in the logs.
- `JWT_SECRET` missing or too short refuses to start.
- All 47 server files parse; every relative `require` resolves.
- All 51 client files parse as JSX; every relative import resolves.

A full `vite build` could not run here — the `node_modules` in the upload
contains Windows-native binaries and this sandbox has no network. Run
`npm install && npm run build` in `client/` to confirm on your machine.
