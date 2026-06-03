# Plan 05 — Portfolio Dashboard

## Objective

Build the main dashboard page (`/`). Shows total portfolio value, unrealized P&L, and per-asset holdings cards with live prices. Uses granular `Suspense` per section and the skeleton discriminated union pattern.

## Dependencies

- Plans 01, 02, 03 complete.
- Plan 04 (UI theme) complete — Tailwind tokens and shadcn must be available.

---

## Component Responsibilities

| Component              | Responsibility                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `PortfolioSummary`     | Pure presentation — renders total value + P&L. Supports `skeleton`.                     |
| `AssetCard`            | Pure presentation — renders one holding card. Supports `skeleton`.                      |
| `PnlBadge`             | Pure presentation — colored P&L indicator.                                              |
| `PortfolioSummaryData` | Server Component — calls `getPortfolio`, renders `<PortfolioSummary data={...} />`      |
| `AssetCardsData`       | Server Component — calls `getPortfolio`, renders `<AssetCard data={...} />` per holding |

Data fetching never happens inside `PortfolioSummary` or `AssetCard`.

---

## 1. Dashboard Page

**File:** `app/(dashboard)/page.tsx`

```tsx
import { Suspense } from "react";
import { PortfolioSummary } from "@/features/portfolio/components/PortfolioSummary";
import { PortfolioSummaryData } from "@/features/portfolio/components/PortfolioSummaryData";
import { AssetCard } from "@/features/portfolio/components/AssetCard";
import { AssetCardsData } from "@/features/portfolio/components/AssetCardsData";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Suspense fallback={<PortfolioSummary skeleton />}>
        <PortfolioSummaryData />
      </Suspense>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense
          fallback={
            <>
              <AssetCard skeleton />
              <AssetCard skeleton />
              <AssetCard skeleton />
            </>
          }
        >
          <AssetCardsData />
        </Suspense>
      </section>
    </div>
  );
}
```

---

## 2. Portfolio Types

**File:** `features/portfolio/types/index.ts`

(Already defined in plan 03 — do not redefine.)

```ts
export type Holding = { ... };
export type PortfolioData = { ... };
```

---

## 3. PortfolioSummary — Pure Presentation

**File:** `features/portfolio/components/PortfolioSummary.tsx`

```tsx
import { formatUSD } from "@/lib/utils/formatters";
import { PnlBadge } from "./PnlBadge";
import type { PortfolioData } from "../types";

type Props =
  | { skeleton: true }
  | {
      skeleton?: false;
      data: Pick<
        PortfolioData,
        "totalValueUsd" | "totalPnlAbsolute" | "totalPnlPercent"
      >;
    };

export function PortfolioSummary(props: Props) {
  if (props.skeleton) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 animate-pulse rounded bg-card" />
        <div className="h-10 w-56 animate-pulse rounded bg-card" />
        <div className="h-5 w-24 animate-pulse rounded bg-card" />
      </div>
    );
  }

  const { totalValueUsd, totalPnlAbsolute, totalPnlPercent } = props.data;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">Valor total del portfolio</p>
      <p className="text-4xl font-bold text-foreground">
        {formatUSD(totalValueUsd)}
      </p>
      <PnlBadge absolute={totalPnlAbsolute} percent={totalPnlPercent} />
    </div>
  );
}
```

---

## 4. PortfolioSummaryData — Server Component (data fetching only)

**File:** `features/portfolio/components/PortfolioSummaryData.tsx`

```tsx
import { requireSession } from "@/lib/auth/server";
import { getPortfolio } from "../api/get-portfolio";
import { PortfolioSummary } from "./PortfolioSummary";

export async function PortfolioSummaryData() {
  const session = await requireSession();
  const portfolio = await getPortfolio(session.user.id);

  return (
    <PortfolioSummary
      data={{
        totalValueUsd: portfolio.totalValueUsd,
        totalPnlAbsolute: portfolio.totalPnlAbsolute,
        totalPnlPercent: portfolio.totalPnlPercent,
      }}
    />
  );
}
```

---

## 5. AssetCard — Pure Presentation

**File:** `features/portfolio/components/AssetCard.tsx`

```tsx
import Image from "next/image";
import { formatUSD, formatCrypto } from "@/lib/utils/formatters";
import { PnlBadge } from "./PnlBadge";
import type { Holding } from "../types";

type Props = { skeleton: true } | { skeleton?: false; data: Holding };

export function AssetCard(props: Props) {
  if (props.skeleton) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const {
    asset,
    quantity,
    avgBuyPrice,
    currentPrice,
    currentValue,
    pnlAbsolute,
    pnlPercent,
  } = props.data;

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {asset.logoUrl && (
            <Image
              src={asset.logoUrl}
              alt={asset.symbol}
              width={28}
              height={28}
              className="rounded-full"
            />
          )}
          <div>
            <p className="font-semibold text-foreground">{asset.symbol}</p>
            <p className="text-xs text-muted-foreground">{asset.name}</p>
          </div>
        </div>
        <PnlBadge absolute={pnlAbsolute} percent={pnlPercent} compact />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
        <div>
          <p className="text-muted-foreground">Cantidad</p>
          <p className="font-mono text-foreground">{formatCrypto(quantity)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Valor actual</p>
          <p className="font-mono font-semibold text-foreground">
            {formatUSD(currentValue)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Precio actual</p>
          <p className="font-mono text-foreground">{formatUSD(currentPrice)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Precio promedio</p>
          <p className="font-mono text-foreground">{formatUSD(avgBuyPrice)}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. AssetCardsData — Server Component (data fetching only)

**File:** `features/portfolio/components/AssetCardsData.tsx`

```tsx
import { requireSession } from "@/lib/auth/server";
import { getPortfolio } from "../api/get-portfolio";
import { AssetCard } from "./AssetCard";

export async function AssetCardsData() {
  const session = await requireSession();
  const portfolio = await getPortfolio(session.user.id);

  if (portfolio.holdings.length === 0) {
    return (
      <p className="col-span-full text-sm text-muted-foreground">
        No tienes activos registrados.{" "}
        <a href="/transactions/new" className="text-primary underline">
          Registra tu primera compra
        </a>
      </p>
    );
  }

  return (
    <>
      {portfolio.holdings.map((holding) => (
        <AssetCard key={holding.asset.id} data={holding} />
      ))}
    </>
  );
}
```

> **Note:** `PortfolioSummaryData` and `AssetCardsData` both call `getPortfolio`. To avoid two DB+CoinGecko round trips, wrap `getPortfolio` with `React.cache()` in `features/portfolio/api/get-portfolio.ts`:
>
> ```ts
> import { cache } from 'react';
> export const getPortfolio = cache(async (userId: string): Promise<PortfolioData> => { ... });
> ```
>
> React deduplicates calls with the same `userId` within the same render pass.

---

## 7. PnlBadge — Pure Presentation

**File:** `features/portfolio/components/PnlBadge.tsx`

```tsx
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatUSD, formatPercent } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

type Props = {
  absolute: number;
  percent: number;
  compact?: boolean;
};

export function PnlBadge({ absolute, percent, compact = false }: Props) {
  const isPositive = absolute > 0;
  const isNegative = absolute < 0;

  const colorClass = isPositive
    ? "text-green-400"
    : isNegative
      ? "text-red-400"
      : "text-muted-foreground";

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div
      className={cn("flex items-center gap-1 text-sm font-medium", colorClass)}
    >
      <Icon size={14} />
      {compact ? (
        <span>{formatPercent(percent)}</span>
      ) : (
        <span>
          {formatUSD(absolute)} ({formatPercent(percent)})
        </span>
      )}
    </div>
  );
}
```

---

## 8. Dashboard Layout

**File:** `app/(dashboard)/layout.tsx`

```tsx
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
```

**File:** `components/layout/Sidebar.tsx`

```tsx
import Link from "next/link";
import { LayoutDashboard, ArrowLeftRight } from "lucide-react";

const NAV = [
  { href: "/", label: "Portfolio", icon: LayoutDashboard },
  { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-border bg-card px-3 py-4">
      <div className="mb-8 px-2">
        <span className="text-lg font-bold text-primary">CryptoTracker</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

**File:** `components/layout/Header.tsx`

```tsx
import { getServerSession } from "@/lib/auth/server";
import { LogOut } from "lucide-react";

export async function Header() {
  const session = await getServerSession();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div />
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{session?.user?.email}</span>
        <a href="/api/auth/sign-out" className="hover:text-foreground">
          <LogOut size={16} />
        </a>
      </div>
    </header>
  );
}
```

**File:** `app/(dashboard)/providers.tsx`

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

---

## 9. Verification Checklist

- [ ] `/` renders without errors when logged in.
- [ ] `PortfolioSummary` skeleton visible during data load (test by adding artificial delay).
- [ ] `AssetCard` skeletons (×3) visible during data load.
- [ ] Neither `PortfolioSummary` nor `AssetCard` import `db`, `getPortfolio`, or any fetcher.
- [ ] After adding a BTC buy transaction, BTC card appears on dashboard.
- [ ] P&L shows green when current price > avg buy price.
- [ ] P&L shows red when current price < avg buy price.
- [ ] Empty state shows link to add first transaction.
- [ ] `getPortfolio` is wrapped with `React.cache()` — only one DB query per render.
- [ ] Sidebar navigation works.
