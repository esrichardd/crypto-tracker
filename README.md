# Crypto Tracker

A personal crypto portfolio tracker with a dark, Binance-inspired UI. Track your holdings, log transactions, and monitor real-time prices — all in one place.

## Features

- Portfolio overview with total value and P&L
- Per-asset holdings and performance
- Transaction history (buy/sell)
- Live prices via CoinGecko API (auto-refresh every 60s)
- Authentication via Neon Auth

## Stack

| Layer         | Tech                        |
| ------------- | --------------------------- |
| Framework     | Next.js 16 (App Router)     |
| Language      | TypeScript (strict)         |
| Styling       | Tailwind CSS v4 + shadcn/ui |
| Database      | Neon Postgres + Drizzle ORM |
| Auth          | Neon Auth (Better Auth)     |
| Data fetching | TanStack Query v5           |
| Validation    | Zod                         |
| Prices        | CoinGecko API (free tier)   |

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Create a `.env.local` file at the root:

```env
# Neon Postgres connection string
DATABASE_URL=

# Public URL of the app (used for redirects and OAuth callbacks)
NEXT_PUBLIC_APP_URL=

# Neon Auth base URL (from your Neon project auth settings)
NEON_AUTH_BASE_URL=

# Secret used to sign session cookies (min 32 chars)
NEON_AUTH_COOKIE_SECRET=

# 32-byte hex key for AES-256-GCM encryption of exchange API keys
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=
```

### 3. Push the database schema

```bash
pnpm drizzle-kit push
```

### 4. (Optional) Seed the database

```bash
pnpm db:seed
```

### 5. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

| Command                   | Description                        |
| ------------------------- | ---------------------------------- |
| `pnpm dev`                | Start local dev server             |
| `pnpm build`              | Production build                   |
| `pnpm lint`               | Run ESLint                         |
| `pnpm drizzle-kit push`   | Apply schema changes to Neon       |
| `pnpm drizzle-kit studio` | Open Drizzle visual DB editor      |
| `pnpm db:seed`            | Seed the database with sample data |
