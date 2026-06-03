# Plan 00 — Overview & Architecture

## Objective

Document the full project architecture, conventions, and execution order so any chat session can pick up context immediately and implement consistently.

## Dependencies

None. This is the root reference document.

---

## Tech Stack

| Layer        | Technology                             |
| ------------ | -------------------------------------- |
| Framework    | Next.js 16 (App Router)                |
| Language     | TypeScript (strict)                    |
| Styling      | Tailwind CSS v4 + shadcn/ui            |
| Database     | Neon Postgres                          |
| ORM          | Drizzle ORM                            |
| Auth         | Neon Auth (Better Auth under the hood) |
| Server State | Server Components + API Routes         |
| Client State | TanStack Query v5                      |
| Validation   | Zod                                    |
| Icons        | lucide-react                           |
| Prices API   | CoinGecko (free tier)                  |

---

## Full File Structure

```
crypto-tracker/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   │   └── page.tsx
│   │   └── sign-up/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           — Sidebar + header shell
│   │   ├── page.tsx             — Portfolio overview (/)
│   │   └── transactions/
│   │       ├── page.tsx         — Transaction history
│   │       └── new/
│   │           └── page.tsx     — Add transaction form
│   ├── api/
│   │   ├── portfolio/
│   │   │   └── route.ts
│   │   ├── transactions/
│   │   │   ├── route.ts         — GET list / POST create
│   │   │   └── [id]/
│   │   │       └── route.ts     — DELETE
│   │   └── assets/
│   │       └── route.ts         — GET asset catalog
│   ├── globals.css              — Tailwind tokens + base styles
│   └── layout.tsx               — Root layout, TanStack QueryProvider
│
├── features/
│   ├── portfolio/
│   │   ├── api/
│   │   │   └── get-portfolio.ts
│   │   ├── components/
│   │   │   ├── PortfolioSummary.tsx
│   │   │   ├── AssetCard.tsx
│   │   │   └── PnlBadge.tsx
│   │   └── types/
│   │       └── index.ts
│   ├── transactions/
│   │   ├── api/
│   │   │   ├── get-transactions.ts
│   │   │   ├── create-transaction.ts
│   │   │   └── delete-transaction.ts
│   │   ├── components/
│   │   │   ├── TransactionForm.tsx
│   │   │   ├── TransactionTable.tsx
│   │   │   └── TransactionFilters.tsx
│   │   └── types/
│   │       └── index.ts
│   └── assets/
│       ├── api/
│       │   └── get-assets.ts
│       ├── components/
│       │   └── AssetSelector.tsx
│       └── types/
│           └── index.ts
│
├── components/
│   └── ui/                      — shadcn components (button, input, etc.)
│
├── lib/
│   ├── db/
│   │   ├── index.ts             — Drizzle client singleton
│   │   ├── schema.ts            — Full Drizzle schema
│   │   └── seed.ts              — Seed BTC/ETH/SOL into assets table
│   ├── coingecko/
│   │   ├── client.ts            — fetch wrapper for CoinGecko API
│   │   └── types.ts
│   ├── binance/                 — PLACEHOLDER (future integration)
│   │   └── .gitkeep
│   ├── utils/
│   │   ├── pnl.ts               — P&L, DCA, unrealized gain helpers
│   │   └── formatters.ts        — USD/crypto number formatting
│   └── auth/
│       └── server.ts            — getServerSession helper
│
├── hooks/
│   ├── use-prices.ts            — TanStack Query → CoinGecko
│   ├── use-portfolio.ts
│   └── use-transactions.ts
│
├── types/
│   └── index.ts                 — Shared global types
│
├── plans/                       — This directory
├── CLAUDE.md
├── drizzle.config.ts
└── .env.local
```

---

## Plan Execution Order

Execute plans in this order. Each plan depends on the previous being complete.

| Order | Plan                 | Description                        |
| ----- | -------------------- | ---------------------------------- |
| 1     | `01-db-schema.md`    | Schema + migrations + seed         |
| 2     | `02-auth.md`         | Neon Auth setup + protected routes |
| 3     | `03-api-routes.md`   | All API endpoints                  |
| 4     | `04-ui-theme.md`     | Tailwind tokens + globals + shadcn |
| 5     | `05-dashboard.md`    | Portfolio dashboard page           |
| 6     | `06-transactions.md` | Transactions form + history page   |

---

## Global Conventions

### Skeleton pattern (mandatory)

```tsx
// Every component receiving async data must support skeleton variant
type Props = { skeleton: true } | { skeleton?: false; data: MyData };

export function MyComponent(props: Props) {
  if (props.skeleton) {
    return <div className="h-20 w-full animate-pulse rounded-lg bg-card" />;
  }
  return <div>{props.data.value}</div>;
}

// In page.tsx — granular Suspense per section
<Suspense fallback={<MyComponent skeleton />}>
  <MyComponentServer />
</Suspense>;
```

### Server vs Client Components

- Default: Server Component.
- Add `"use client"` only for: `useState`, `useEffect`, event handlers, browser APIs, TanStack Query hooks.
- Never put `"use client"` on a full page if only one section needs it — isolate interactivity.

### Data flow

```
page.tsx (Server)
  └── features/[feature]/api/get-*.ts   — DB query via Drizzle
        └── Component.tsx (Server)      — receives typed data
              └── ClientWidget.tsx      — "use client" only if needed
```

### P&L calculation pattern

All P&L logic lives in `lib/utils/pnl.ts`. Never compute P&L inside a component or API route directly — always import helpers.

```ts
// lib/utils/pnl.ts
export function calcUnrealizedPnl(
  avgBuyPrice: number,
  currentPrice: number,
  quantity: number,
) {
  const costBasis = avgBuyPrice * quantity;
  const currentValue = currentPrice * quantity;
  return {
    absolute: currentValue - costBasis,
    percent: ((currentValue - costBasis) / costBasis) * 100,
  };
}

export function calcAvgBuyPrice(
  transactions: { price: number; quantity: number }[],
) {
  const buys = transactions.filter((t) => t.type === "buy"); // filter before passing
  const totalCost = buys.reduce((sum, t) => sum + t.price * t.quantity, 0);
  const totalQty = buys.reduce((sum, t) => sum + t.quantity, 0);
  return totalQty === 0 ? 0 : totalCost / totalQty;
}
```

### Number formatting

```ts
// lib/utils/formatters.ts
export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatCrypto(value: number, decimals = 8): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
```

---

## Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://...       # Neon connection string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Verification

After reading this plan, a session should be able to answer:

- Where does DB logic live? → `lib/db/schema.ts` + `features/[feature]/api/`
- Where do types live? → `features/[feature]/types/` and `types/index.ts`
- Where do skeletons live? → Inside the component file, as a discriminated union variant
- What order to execute plans? → See table above
