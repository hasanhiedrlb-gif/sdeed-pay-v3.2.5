# sdeed-pay

**sdeed-pay** is the Financial Bank and Accounting Ledger for the whole platform.
It is the single source of truth for **Wallets**, **Balances**, and **Transactions**.

It does **not** store user passwords or profiles — it only ever stores `userId`
(the `GLOBAL_USER_ID` issued by `kamekaz-auth`) and never trusts a `userId` sent
directly by a client without first verifying it with `kamekaz-auth`.

---

## 1. Tech Stack

| Layer          | Tech                                      |
|----------------|--------------------------------------------|
| API            | NestJS 10 + Prisma + PostgreSQL             |
| Admin Panel    | Next.js 14 (App Router) + Tailwind CSS + shadcn-style UI kit |
| Auth           | JWT (admin panel), shared API key (service-to-service) |
| Currency       | LBP                                         |
| Monorepo       | pnpm workspaces                             |

---

## 2. Project Structure

```
sdeed-pay/
├── apps/
│   ├── api/                 # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── wallets/
│   │   │   ├── transactions/
│   │   │   ├── integration/
│   │   │   ├── kamekaz/         # kamekaz-auth HTTP client
│   │   │   ├── common/guards/   # JwtAuthGuard, ApiKeyGuard
│   │   │   └── prisma/
│   │   └── .env.example
│   └── admin/                # Next.js 14 admin panel
│       ├── app/
│       │   ├── login/
│       │   ├── dashboard/
│       │   ├── wallets/
│       │   │   └── [userId]/
│       │   ├── transactions/
│       │   └── actions/{topup,payout}/
│       ├── components/
│       └── .env.example
├── postman_collection.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 3. How to Run

### Prerequisites
- Node.js >= 18
- pnpm >= 8
- PostgreSQL running locally (or Docker)

### 3.1 Install dependencies

```bash
pnpm install
```

### 3.2 Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
```

Edit `apps/api/.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_db?schema=public"
JWT_SECRET="change-me-super-secret"
JWT_EXPIRES_IN="8h"
PORT=4000
KAMEKAZ_BASE_URL="https://kamekaz.com"
INTERNAL_API_KEY="change-me-internal-key"
```

Edit `apps/admin/.env`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

### 3.3 Create the database and run migrations

```bash
createdb finance_db   # or use your preferred Postgres client
pnpm --filter sdeed-pay-api prisma migrate dev --name init
pnpm --filter sdeed-pay-api prisma:seed
```

This creates the admin login:

```
email:    admin@sdeed.com
password: Admin123!
```

### 3.4 Run the backend

```bash
pnpm dev:api
# API available at http://localhost:4000/api
```

### 3.5 Run the admin panel

```bash
pnpm dev:admin
# Admin panel available at http://localhost:3000
```

Log in with `admin@sdeed.com` / `Admin123!`.

---

## 4. API Documentation

Base URL: `http://localhost:4000/api`

### Auth

| Method | Path          | Auth | Description |
|--------|---------------|------|--------------|
| POST   | `/auth/login` | none | `{ email, password }` → `{ accessToken, admin }` |

### Wallets

| Method | Path              | Auth              | Description |
|--------|-------------------|-------------------|--------------|
| POST   | `/wallets/create` | `x-api-key`       | `{ userId }`. Verifies the user exists and `status=APPROVED` in kamekaz-auth (`GET https://kamekaz.com/user/:id`) before creating the wallet. Called by kamekaz-auth when an admin approves a new user. |
| GET    | `/wallets`        | JWT (admin)       | List all wallets. |
| GET    | `/wallets/:userId`| JWT (admin)       | `{ userId, balance, currency }` |
| POST   | `/wallets/topup`  | JWT (admin)       | `{ userId, amount, description }`. Creates a `TOPUP` transaction, credits the wallet atomically. |
| POST   | `/wallets/payout` | JWT (admin)       | `{ userId, amount, description }`. Creates a `PAYOUT` transaction, debits the wallet atomically (rejects if insufficient balance). |

### Transactions

| Method | Path                      | Auth        | Description |
|--------|---------------------------|-------------|--------------|
| POST   | `/transactions/transfer`  | `x-api-key` | `{ fromUserId, toUserId, amount, appSource, referenceId, type?, description? }`. Checks `fromUserId` balance, debits/credits both wallets in a single DB transaction. **Idempotent** — replaying the same `referenceId` returns the original transaction instead of moving money twice. |
| GET    | `/transactions`           | JWT (admin) | Query params: `userId`, `appSource`, `type`, `fromDate`, `toDate`. Returns the full ledger, filtered. |

### Integration

| Method | Path                             | Auth   | Description |
|--------|----------------------------------|--------|--------------|
| GET    | `/integration/balance/:userId`   | public | `{ balance, currency }`. Used by fleet.os to check if a user can pay for an order before calling `/transactions/transfer`. |

---

## 5. Integration Flow

### 5.1 New user is approved -> wallet is created

```
kamekaz-auth                         sdeed-pay
     |                                    |
     | admin approves user (status=APPROVED)
     |                                    |
     |--- POST /wallets/create ---------->|
     |    { userId }                      |
     |    header: x-api-key               |
     |                                    |--- GET kamekaz.com/user/:id ---> kamekaz-auth
     |                                    |<-- { status: APPROVED } ---------|
     |                                    |
     |                                    | creates Wallet(userId, balance=0)
     |<--- 201 Wallet --------------------|
```

### 5.2 fleet.os processes an order payment

```
fleet.os                              sdeed-pay
   |                                       |
   |--- GET /integration/balance/:userId ->|
   |<-- { balance } ------------------------|
   |                                       |
   |  (fleet.os decides user can pay)
   |                                       |
   |--- POST /transactions/transfer ------>|
   |    { fromUserId, toUserId, amount,    |
   |      appSource: "fleet.os",           |
   |      referenceId: "fleetos-order-1" } |
   |    header: x-api-key                  |
   |                                       | check referenceId not already used
   |                                       | check fromUserId balance >= amount
   |                                       | DB transaction: debit + credit + record Transaction
   |<--- 201 Transaction --------------------|
```

If fleet.os retries the same request (timeout, network blip) with the same
`referenceId`, sdeed-pay detects the duplicate and returns the original
transaction instead of double-charging the user.

### 5.3 Admin manually tops up / pays out a wallet

```
Admin (Next.js panel)                 sdeed-pay
   |                                       |
   |--- POST /auth/login ----------------->|
   |<-- { accessToken } --------------------|
   |                                       |
   |--- POST /wallets/topup --------------->|
   |    header: Authorization: Bearer JWT  |
   |                                       | DB transaction: credit wallet + record TOPUP tx
   |                                       | logs admin action (email + amount)
   |<--- 200 { wallet, transaction } --------|
```

---

## 6. Security Notes

1. **Idempotency** — `/transactions/transfer` is idempotent on `referenceId` (unique DB constraint + pre-check). Safe to retry.
2. **Server-to-server auth** — `/wallets/create` and `/transactions/transfer` require a shared `x-api-key` header (`INTERNAL_API_KEY`), since they are called by other platform services and never by end users directly.
3. **Admin auth** — All admin panel endpoints (`GET /wallets`, `GET /wallets/:userId`, `POST /wallets/topup`, `POST /wallets/payout`, `GET /transactions`) require a valid JWT issued by `/auth/login`.
4. **Never trust client userId** — `/wallets/create` always calls kamekaz-auth to verify the user exists and is `APPROVED` before creating a wallet.
5. **Atomic money movement** — Every balance change (topup, payout, transfer) happens inside a Prisma `$transaction`, so a wallet is never left in a partially-updated state.
6. **Admin action logging** — Every topup/payout logs the admin's email, the amount, and the target userId via the NestJS `Logger`.

---

## 7. Postman Collection

Import `postman_collection.json` at the project root into Postman. It includes
requests for every endpoint above, with `{{baseUrl}}`, `{{token}}`,
`{{internalApiKey}}`, and `{{userId}}` collection variables — run `Auth > Login`
first and paste the returned `accessToken` into the `token` variable.

---

## 8. Admin UI Pages

| Page                     | Description |
|--------------------------|--------------|
| `/login`                 | Admin login |
| `/dashboard`             | Total Wallets, Total Balance, Today's Transactions |
| `/wallets`               | Searchable table of all wallets, "View Ledger" per row |
| `/wallets/[userId]`      | Balance + full transaction history for one user |
| `/transactions`          | Full ledger with Date/App/Type filters + CSV export |
| `/actions/topup`         | Top up a wallet |
| `/actions/payout`        | Pay out from a wallet |

Every protected page is wrapped in `<AuthGuard>`, which checks for a valid JWT
in `localStorage` and redirects to `/login` if missing. Negative balances are
rendered in red. All amounts are formatted as `1,234,567 LBP`.
