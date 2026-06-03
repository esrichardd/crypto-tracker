# Plan 06 — Transactions

## Objective

Build two pages: the transaction history (`/transactions`) with filters, and the add transaction form (`/transactions/new`). Both follow skeleton pattern and feature-based architecture.

## Dependencies

- Plans 01, 02, 03, 04 complete.

---

## 1. Transaction History Page

**File:** `app/(dashboard)/transactions/page.tsx`

```tsx
import { Suspense } from "react";
import { TransactionFilters } from "@/features/transactions/components/TransactionFilters";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { TransactionTableServer } from "@/features/transactions/components/TransactionTableServer";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { TransactionFilters as Filters } from "@/features/transactions/types";

type PageProps = {
  searchParams: Promise<{
    assetId?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: Filters = {
    assetId: params.assetId,
    type:
      params.type === "buy" || params.type === "sell" ? params.type : undefined,
    from: params.from,
    to: params.to,
    page: params.page ? Number(params.page) : 1,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Transacciones</h1>
        <Link href="/transactions/new">
          <Button size="sm" className="flex items-center gap-2">
            <Plus size={14} />
            Nueva transacción
          </Button>
        </Link>
      </div>

      <TransactionFilters current={filters} />

      <Suspense fallback={<TransactionTable skeleton />}>
        <TransactionTableServer filters={filters} />
      </Suspense>
    </div>
  );
}
```

---

## 2. Transaction Types

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
  date: string;
  notes: string | null;
  source: "manual" | "binance" | "csv";
  createdAt: string;
  asset: {
    id: string;
    symbol: string;
    name: string;
    logoUrl: string | null;
  };
};
```

---

## 3. TransactionTable Component

**File:** `features/transactions/components/TransactionTable.tsx`

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { formatUSD, formatCrypto } from "@/lib/utils/formatters";
import { deleteTransaction } from "../api/delete-transaction";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionRow } from "../types";

type Props = { skeleton: true } | { skeleton?: false; data: TransactionRow[] };

function TransactionTableInner({ data }: { data: TransactionRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay transacciones registradas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Activo</th>
            <th className="px-4 py-3 text-left font-medium">Tipo</th>
            <th className="px-4 py-3 text-right font-medium">Cantidad</th>
            <th className="px-4 py-3 text-right font-medium">Precio</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-right font-medium">Fee</th>
            <th className="px-4 py-3 text-left font-medium">Fecha</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((tx) => {
            const total = Number(tx.priceUsd) * Number(tx.quantity);
            return (
              <tr
                key={tx.id}
                className="bg-background transition-colors hover:bg-card"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {tx.asset.logoUrl && (
                      <Image
                        src={tx.asset.logoUrl}
                        alt={tx.asset.symbol}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    )}
                    <span className="font-medium text-foreground">
                      {tx.asset.symbol}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium",
                      tx.type === "buy"
                        ? "bg-green-400/10 text-green-400"
                        : "bg-red-400/10 text-red-400",
                    )}
                  >
                    {tx.type === "buy" ? "Compra" : "Venta"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground">
                  {formatCrypto(Number(tx.quantity))}
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground">
                  {formatUSD(Number(tx.priceUsd))}
                </td>
                <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                  {formatUSD(total)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {Number(tx.fee) > 0 ? formatUSD(Number(tx.fee)) : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(tx.date).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className="text-muted-foreground transition-colors hover:text-red-400 disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TransactionTable(props: Props) {
  if (props.skeleton) {
    return (
      <div className="overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-border bg-background px-4 py-3"
          >
            <div className="h-4 w-16 animate-pulse rounded bg-card" />
            <div className="h-4 w-10 animate-pulse rounded bg-card" />
            <div className="ml-auto h-4 w-24 animate-pulse rounded bg-card" />
          </div>
        ))}
      </div>
    );
  }

  return <TransactionTableInner data={props.data} />;
}
```

---

## 4. TransactionTableServer

**File:** `features/transactions/components/TransactionTableServer.tsx`

```tsx
import { db } from "@/lib/db";
import { transactions, assets } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/server";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { TransactionTable } from "./TransactionTable";
import type { TransactionFilters } from "../types";

export async function TransactionTableServer({
  filters,
}: {
  filters: TransactionFilters;
}) {
  const session = await requireSession();
  const userId = session.user.id;

  const conditions = [eq(transactions.userId, userId)];
  if (filters.assetId)
    conditions.push(eq(transactions.assetId, filters.assetId));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.from)
    conditions.push(gte(transactions.date, new Date(filters.from)));
  if (filters.to) conditions.push(lte(transactions.date, new Date(filters.to)));

  const limit = filters.limit ?? 20;
  const offset = ((filters.page ?? 1) - 1) * limit;

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

  return <TransactionTable data={rows as any} />;
}
```

---

## 5. TransactionFilters Component

Client component — updates URL search params on filter change (no full reload, uses router.push).

**File:** `features/transactions/components/TransactionFilters.tsx`

```tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { TransactionFilters } from "../types";

type Props = {
  current: TransactionFilters;
};

export function TransactionFilters({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [type, setType] = useState(current.type ?? "");
  const [from, setFrom] = useState(current.from ?? "");
  const [to, setTo] = useState(current.to ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    setType("");
    setFrom("");
    setTo("");
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Todos</option>
          <option value="buy">Compra</option>
          <option value="sell">Venta</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Desde</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Hasta</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <button
        onClick={apply}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
      >
        Filtrar
      </button>
      <button
        onClick={clear}
        className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Limpiar
      </button>
    </div>
  );
}
```

---

## 6. Add Transaction Page

**File:** `app/(dashboard)/transactions/new/page.tsx`

```tsx
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";

export default async function NewTransactionPage() {
  const assetList = await db.select().from(assets).orderBy(assets.symbol);

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Nueva transacción
      </h1>
      <TransactionForm assets={assetList} />
    </div>
  );
}
```

---

## 7. TransactionForm Component

**File:** `features/transactions/components/TransactionForm.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "../api/create-transaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Asset } from "@/lib/db/schema";

type Props = {
  assets: Asset[];
};

export function TransactionForm({ assets }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    assetId: assets[0]?.id ?? "",
    type: "buy" as "buy" | "sell",
    priceUsd: "",
    quantity: "",
    fee: "",
    date: new Date().toISOString().slice(0, 16), // datetime-local format
    notes: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Derived: total cost
  const total =
    form.priceUsd && form.quantity
      ? (Number(form.priceUsd) * Number(form.quantity)).toFixed(2)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createTransaction({
        assetId: form.assetId,
        type: form.type,
        priceUsd: form.priceUsd,
        quantity: form.quantity,
        fee: form.fee || "0",
        date: new Date(form.date).toISOString(),
        notes: form.notes || undefined,
      });
      router.push("/transactions");
      router.refresh();
    } catch (err) {
      setError("No se pudo registrar la transacción. Verifica los datos.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6"
    >
      {/* Asset */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="assetId">Criptomoneda</Label>
        <select
          id="assetId"
          value={form.assetId}
          onChange={(e) => set("assetId", e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.symbol} — {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <Label>Tipo</Label>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["buy", "sell"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", t)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                form.type === t
                  ? t === "buy"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "buy" ? "Compra" : "Venta"}
            </button>
          ))}
        </div>
      </div>

      {/* Price + Quantity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priceUsd">Precio (USD)</Label>
          <Input
            id="priceUsd"
            type="number"
            step="any"
            min="0"
            placeholder="65000"
            value={form.priceUsd}
            onChange={(e) => set("priceUsd", e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quantity">Cantidad</Label>
          <Input
            id="quantity"
            type="number"
            step="any"
            min="0"
            placeholder="0.5"
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            required
          />
        </div>
      </div>

      {/* Total preview */}
      {total && (
        <p className="text-sm text-muted-foreground">
          Total estimado:{" "}
          <span className="font-mono text-foreground">${total}</span>
        </p>
      )}

      {/* Fee */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fee">Comisión (USD) — opcional</Label>
        <Input
          id="fee"
          type="number"
          step="any"
          min="0"
          placeholder="0"
          value={form.fee}
          onChange={(e) => set("fee", e.target.value)}
        />
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date">Fecha y hora</Label>
        <input
          id="date"
          type="datetime-local"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notas — opcional</Label>
        <Input
          id="notes"
          placeholder="Compra DCA mensual..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Guardando..." : "Registrar transacción"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
```

---

## 8. Verification Checklist

- [ ] `/transactions` renders without errors (empty state shown for new user).
- [ ] Skeleton visible during table load.
- [ ] `/transactions/new` shows form with asset selector populated from DB.
- [ ] Submitting form with valid data creates transaction and redirects to `/transactions`.
- [ ] Submitting form with empty required fields is prevented by browser validation.
- [ ] Transaction appears in table after creation.
- [ ] Delete button removes transaction, table refreshes.
- [ ] Filter by type=buy shows only buys.
- [ ] Filter by date range works.
- [ ] Clearing filters shows all transactions.
- [ ] Total estimado updates in real time as price/quantity are entered.
