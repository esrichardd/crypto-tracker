# Plan 03 — API Routes

## Objective

Implement all API endpoints with a clean separation of concerns: service functions in `features/[feature]/api/` own all DB logic, API routes are thin (auth + parse + call service + respond). A shared error helper eliminates boilerplate.

## Dependencies

- Plan 01 (DB schema) complete.
- Plan 02 (Auth) complete — `requireSession()` must be available.

---

## Architecture Pattern

```
app/api/[resource]/route.ts     — auth → parse params → call service → return JSON
features/[feature]/api/*.ts     — all DB queries and business logic
lib/api/handle-error.ts         — shared error handler for routes
```

---

## Response Shape Convention

```ts
// Success
{
  data: T;
}

// Error
{
  error: string;
}
```

---

## 1. Shared Error Handler

**File:** `lib/api/handle-error.ts`

```ts
import { NextResponse } from "next/server";

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof Error && err.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (err instanceof Error && err.message === "Not found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

---

## 2. Assets Service + Route

### Service

**File:** `features/assets/api/get-assets.ts`

```ts
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import type { Asset } from "@/lib/db/schema";

export async function getAssets(): Promise<Asset[]> {
  return db.select().from(assets).orderBy(assets.symbol);
}
```

### Route

**File:** `app/api/assets/route.ts`

```ts
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getAssets } from "@/features/assets/api/get-assets";
import { handleApiError } from "@/lib/api/handle-error";

export async function GET() {
  try {
    await requireSession();
    const data = await getAssets();
    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
```

---

## 3. Transactions Service + Routes

### Types

**File:** `features/transactions/types/index.ts`

```ts
export type TransactionFilters = {
  assetId?: string;
  type?: "buy" | "sell";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type TransactionRow = {
  id: string;
  type: "buy" | "sell";
  priceUsd: string;
  quantity: string;
  fee: string;
  date: Date;
  notes: string | null;
  source: "manual" | "binance" | "csv";
  createdAt: Date;
  asset: {
    id: string;
    symbol: string;
    name: string;
    logoUrl: string | null;
  };
};

export type CreateTransactionInput = {
  assetId: string;
  type: "buy" | "sell";
  priceUsd: string;
  quantity: string;
  fee?: string;
  date: string;
  notes?: string;
};
```

### Zod Schema (shared between service and route)

**File:** `features/transactions/api/transaction-schema.ts`

```ts
import { z } from "zod";

export const createTransactionSchema = z.object({
  assetId: z.string().min(1),
  type: z.enum(["buy", "sell"]),
  priceUsd: z.string().regex(/^\d+(\.\d+)?$/, "Must be a positive number"),
  quantity: z.string().regex(/^\d+(\.\d+)?$/, "Must be a positive number"),
  fee: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional()
    .default("0"),
  date: z.string().datetime({ offset: true }),
  notes: z.string().max(500).optional(),
});

export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;
```

### Get Transactions

**File:** `features/transactions/api/get-transactions.ts`

```ts
import { db } from "@/lib/db";
import { transactions, assets } from "@/lib/db/schema";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import type { TransactionFilters, TransactionRow } from "../types";

export async function getTransactions(
  userId: string,
  filters: TransactionFilters = {},
): Promise<TransactionRow[]> {
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = ((filters.page ?? 1) - 1) * limit;

  const conditions = [eq(transactions.userId, userId)];
  if (filters.assetId)
    conditions.push(eq(transactions.assetId, filters.assetId));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.from)
    conditions.push(gte(transactions.date, new Date(filters.from)));
  if (filters.to) conditions.push(lte(transactions.date, new Date(filters.to)));

  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      priceUsd: transactions.priceUsd,
      quantity: transactions.quantity,
      fee: transactions.fee,
      date: transactions.date,
      notes: transactions.notes,
      source: transactions.source,
      createdAt: transactions.createdAt,
      asset: {
        id: assets.id,
        symbol: assets.symbol,
        name: assets.name,
        logoUrl: assets.logoUrl,
      },
    })
    .from(transactions)
    .innerJoin(assets, eq(transactions.assetId, assets.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date))
    .limit(limit)
    .offset(offset);

  return rows as TransactionRow[];
}
```

### Create Transaction

**File:** `features/transactions/api/create-transaction.ts`

```ts
import { db } from "@/lib/db";
import { transactions, assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Transaction } from "@/lib/db/schema";
import type { CreateTransactionSchema } from "./transaction-schema";

export async function createTransaction(
  userId: string,
  input: CreateTransactionSchema,
): Promise<Transaction> {
  // Verify asset exists
  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, input.assetId),
  });
  if (!asset) throw new Error("Not found");

  const [created] = await db
    .insert(transactions)
    .values({
      userId,
      assetId: input.assetId,
      type: input.type,
      priceUsd: input.priceUsd,
      quantity: input.quantity,
      fee: input.fee ?? "0",
      date: new Date(input.date),
      notes: input.notes ?? null,
      source: "manual",
    })
    .returning();

  return created;
}
```

### Delete Transaction

**File:** `features/transactions/api/delete-transaction.ts`

```ts
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function deleteTransaction(
  userId: string,
  transactionId: string,
): Promise<void> {
  const deleted = await db
    .delete(transactions)
    .where(
      and(eq(transactions.id, transactionId), eq(transactions.userId, userId)),
    )
    .returning();

  if (deleted.length === 0) throw new Error("Not found");
}
```

### Routes

**File:** `app/api/transactions/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getTransactions } from "@/features/transactions/api/get-transactions";
import { createTransaction } from "@/features/transactions/api/create-transaction";
import { createTransactionSchema } from "@/features/transactions/api/transaction-schema";
import { handleApiError } from "@/lib/api/handle-error";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = request.nextUrl;

    const data = await getTransactions(session.user.id, {
      assetId: searchParams.get("assetId") ?? undefined,
      type: (searchParams.get("type") as "buy" | "sell") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      page: searchParams.get("page")
        ? Number(searchParams.get("page"))
        : undefined,
      limit: searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
    });

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = await createTransaction(session.user.id, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
```

**File:** `app/api/transactions/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { deleteTransaction } from "@/features/transactions/api/delete-transaction";
import { handleApiError } from "@/lib/api/handle-error";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await deleteTransaction(session.user.id, id);
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return handleApiError(err);
  }
}
```

> **Note:** In Next.js 16, `params` is a Promise — always `await params` before accessing properties.

---

## 4. Portfolio Service + Route

### Types

**File:** `features/portfolio/types/index.ts`

```ts
export type Holding = {
  asset: {
    id: string;
    symbol: string;
    name: string;
    coingeckoId: string;
    logoUrl: string | null;
  };
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  pnlAbsolute: number;
  pnlPercent: number;
};

export type PortfolioData = {
  totalValueUsd: number;
  totalCostBasis: number;
  totalPnlAbsolute: number;
  totalPnlPercent: number;
  holdings: Holding[];
};
```

### Service

**File:** `features/portfolio/api/get-portfolio.ts`

This is the single source of truth for portfolio aggregation — used by both the API route and Server Components.

```ts
import { db } from "@/lib/db";
import { transactions, assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPrices } from "@/lib/coingecko/client";
import { calcAvgBuyPrice, calcUnrealizedPnl } from "@/lib/utils/pnl";
import type { PortfolioData, Holding } from "../types";

export async function getPortfolio(userId: string): Promise<PortfolioData> {
  const rows = await db
    .select({
      type: transactions.type,
      priceUsd: transactions.priceUsd,
      quantity: transactions.quantity,
      asset: {
        id: assets.id,
        symbol: assets.symbol,
        name: assets.name,
        coingeckoId: assets.coingeckoId,
        logoUrl: assets.logoUrl,
      },
    })
    .from(transactions)
    .innerJoin(assets, eq(transactions.assetId, assets.id))
    .where(eq(transactions.userId, userId));

  if (rows.length === 0) {
    return {
      totalValueUsd: 0,
      totalCostBasis: 0,
      totalPnlAbsolute: 0,
      totalPnlPercent: 0,
      holdings: [],
    };
  }

  // Aggregate per asset
  const map = new Map<
    string,
    {
      asset: (typeof rows)[0]["asset"];
      buyTxs: { price: number; quantity: number }[];
      netQty: number;
    }
  >();

  for (const row of rows) {
    const key = row.asset.id;
    if (!map.has(key))
      map.set(key, { asset: row.asset, buyTxs: [], netQty: 0 });
    const h = map.get(key)!;
    const qty = Number(row.quantity);
    const price = Number(row.priceUsd);
    if (row.type === "buy") {
      h.netQty += qty;
      h.buyTxs.push({ price, quantity: qty });
    } else {
      h.netQty -= qty;
    }
  }

  // Fetch live prices in parallel
  const coingeckoIds = [...map.values()].map((h) => h.asset.coingeckoId);
  const prices = await getPrices(coingeckoIds);

  const holdings: Holding[] = [];
  let totalValueUsd = 0;
  let totalCostBasis = 0;

  for (const [, h] of map) {
    if (h.netQty <= 0) continue;
    const avgBuyPrice = calcAvgBuyPrice(h.buyTxs);
    const currentPrice = prices[h.asset.coingeckoId] ?? 0;
    const { absolute: pnlAbsolute, percent: pnlPercent } = calcUnrealizedPnl(
      avgBuyPrice,
      currentPrice,
      h.netQty,
    );
    const costBasis = avgBuyPrice * h.netQty;
    const currentValue = currentPrice * h.netQty;

    totalValueUsd += currentValue;
    totalCostBasis += costBasis;

    holdings.push({
      asset: h.asset,
      quantity: h.netQty,
      avgBuyPrice,
      currentPrice,
      currentValue,
      costBasis,
      pnlAbsolute,
      pnlPercent,
    });
  }

  const totalPnlAbsolute = totalValueUsd - totalCostBasis;
  const totalPnlPercent =
    totalCostBasis === 0 ? 0 : (totalPnlAbsolute / totalCostBasis) * 100;

  return {
    totalValueUsd,
    totalCostBasis,
    totalPnlAbsolute,
    totalPnlPercent,
    holdings,
  };
}
```

### CoinGecko Client

**File:** `lib/coingecko/client.ts`

```ts
const BASE = "https://api.coingecko.com/api/v3";

export async function getPrices(
  ids: string[],
): Promise<Record<string, number>> {
  if (ids.length === 0) return {};

  const res = await fetch(
    `${BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
    { next: { revalidate: 60 } }, // Next.js cache — revalidate every 60s
  );

  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);

  const json = (await res.json()) as Record<string, { usd: number }>;
  return Object.fromEntries(Object.entries(json).map(([id, v]) => [id, v.usd]));
}
```

### Route

**File:** `app/api/portfolio/route.ts`

```ts
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getPortfolio } from "@/features/portfolio/api/get-portfolio";
import { handleApiError } from "@/lib/api/handle-error";

export async function GET() {
  try {
    const session = await requireSession();
    const data = await getPortfolio(session.user.id);
    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
```

---

## 5. Client-Side Fetchers (for hooks)

These are the fetch wrappers used by TanStack Query hooks.

**File:** `features/portfolio/api/fetch-portfolio.ts`

```ts
import type { PortfolioData } from "../types";

export async function fetchPortfolio(): Promise<PortfolioData> {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  const json = await res.json();
  return json.data;
}
```

**File:** `features/transactions/api/fetch-transactions.ts`

```ts
import type { TransactionFilters, TransactionRow } from "../types";

export async function fetchTransactions(
  filters: TransactionFilters = {},
): Promise<TransactionRow[]> {
  const params = new URLSearchParams();
  if (filters.assetId) params.set("assetId", filters.assetId);
  if (filters.type) params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const res = await fetch(`/api/transactions?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const json = await res.json();
  return json.data;
}
```

---

## 6. Verification Checklist

- [ ] `GET /api/assets` returns 3 assets after seeding.
- [ ] `GET /api/transactions` returns `[]` for a new user.
- [ ] `POST /api/transactions` creates a transaction and returns it with status 201.
- [ ] `POST /api/transactions` with invalid body returns 400 with field errors.
- [ ] `DELETE /api/transactions/:id` deletes own transaction, returns `{ data: { id } }`.
- [ ] `DELETE /api/transactions/:id` with another user's transaction returns 404.
- [ ] `GET /api/portfolio` returns correct P&L after adding a buy transaction.
- [ ] All routes return 401 when called without a session.
- [ ] Route files contain no DB imports — all queries go through service files.
