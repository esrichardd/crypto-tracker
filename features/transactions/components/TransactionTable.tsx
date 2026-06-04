"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Trash2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatUSD, formatCrypto } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import type { TransactionRow } from "../types";

// When passed from a Server Component, Date fields are serialized as strings.
type SerializedTransactionRow = Omit<TransactionRow, "date" | "createdAt"> & {
  date: string | Date;
  createdAt: string | Date;
};

type Props =
  | { skeleton: true }
  | {
      skeleton?: false;
      data: SerializedTransactionRow[];
      totalCount: number;
      page: number;
      limit: number;
    };

// ─── Source badge ────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: TransactionRow["source"] }) {
  return (
    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-secondary">
      {source}
    </span>
  );
}

// ─── Type badge ──────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: "buy" | "sell" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        type === "buy"
          ? "bg-success/10 text-success"
          : "bg-danger/10 text-danger",
      )}
    >
      {type === "buy" ? (
        <ArrowUp size={10} aria-hidden />
      ) : (
        <ArrowDown size={10} aria-hidden />
      )}
      {type === "buy" ? "Compra" : "Venta"}
    </span>
  );
}

// ─── Asset cell ──────────────────────────────────────────────────────────────

function AssetCell({
  asset,
}: {
  asset: SerializedTransactionRow["asset"];
}) {
  return (
    <div className="flex items-center gap-2">
      {asset.logoUrl ? (
        <Image
          src={asset.logoUrl}
          alt={asset.symbol}
          width={24}
          height={24}
          className="rounded-full"
        />
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-[9px] font-semibold text-muted-foreground">
          {asset.symbol.slice(0, 2)}
        </div>
      )}
      <div>
        <span className="text-sm font-medium text-foreground">
          {asset.symbol}
        </span>
        <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">
          {asset.name}
        </span>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalCount,
  limit,
}: {
  page: number;
  totalCount: number;
  limit: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const totalPages = Math.ceil(totalCount / limit);

  if (totalPages <= 1) return null;

  function goTo(p: number) {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  // Build page numbers to show: always show first, last, and current ±1
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <span className="text-[11px] text-secondary">
        {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} de{" "}
        {totalCount}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          <ChevronLeft size={13} />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1 text-xs text-muted-foreground"
            >
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p as number)}
              className={cn(
                "h-7 min-w-[28px] rounded border px-2 text-xs transition-colors",
                p === page
                  ? "border-primary bg-primary font-medium text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Inner (data) ─────────────────────────────────────────────────────────────

function TransactionTableInner({
  data,
  totalCount,
  page,
  limit,
}: {
  data: SerializedTransactionRow[];
  totalCount: number;
  page: number;
  limit: number;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        console.error("[TransactionTable] delete failed:", res.status);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("[TransactionTable] delete error:", err);
    } finally {
      setDeletingId(null);
    }
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No hay transacciones registradas.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {/* ── MOBILE: card list ── */}
      <div className="flex flex-col divide-y divide-border md:hidden">
        {data.map((tx) => {
          const total = Number(tx.priceUsd) * Number(tx.quantity);
          return (
            <div key={tx.id} className="bg-background p-3 transition-colors hover:bg-card">
              {/* Top row: asset + type badge + date */}
              <div className="mb-2.5 flex items-center gap-2">
                <AssetCell asset={tx.asset} />
                <TypeBadge type={tx.type} />
                <span className="ml-auto text-[10px] text-secondary">
                  {new Date(tx.date).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Detail grid: qty | price | total */}
              <div className="grid grid-cols-3 gap-1 border-t border-border pt-2.5 text-center">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-secondary">
                    Cantidad
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-foreground">
                    {formatCrypto(Number(tx.quantity))}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-secondary">
                    Precio
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-foreground">
                    {formatUSD(Number(tx.priceUsd))}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-secondary">
                    Total
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-xs font-medium",
                      tx.type === "buy" ? "text-success" : "text-danger",
                    )}
                  >
                    {formatUSD(total)}
                  </p>
                </div>
              </div>

              {/* Footer: source + fee + delete */}
              <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
                <SourceBadge source={tx.source} />
                {Number(tx.fee) > 0 && (
                  <span className="text-[10px] text-secondary">
                    Fee: {formatUSD(Number(tx.fee))}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(tx.id)}
                  disabled={deletingId === tx.id}
                  className="ml-auto text-muted-foreground transition-colors hover:text-danger disabled:opacity-40"
                  aria-label="Eliminar transacción"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP: table ── */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card/60 text-muted-foreground">
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">
                Activo
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">
                Tipo
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                Cantidad
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                Precio
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                Total
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                Fee
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">
                Fuente
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">
                Fecha
              </th>
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
                    <AssetCell asset={tx.asset} />
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={tx.type} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {formatCrypto(Number(tx.quantity))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {formatUSD(Number(tx.priceUsd))}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono font-medium",
                      tx.type === "buy" ? "text-success" : "text-danger",
                    )}
                  >
                    {formatUSD(total)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {Number(tx.fee) > 0 ? formatUSD(Number(tx.fee)) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadge source={tx.source} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
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
                      className="text-muted-foreground transition-colors hover:text-danger disabled:opacity-40"
                      aria-label="Eliminar transacción"
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

      <Pagination page={page} totalCount={totalCount} limit={limit} />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TransactionTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {/* Mobile skeleton */}
      <div className="flex flex-col divide-y divide-border md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 bg-background p-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 animate-pulse rounded-full bg-card" />
              <div className="h-4 w-20 animate-pulse rounded bg-card" />
              <div className="ml-auto h-4 w-12 animate-pulse rounded bg-card" />
            </div>
            <div className="grid grid-cols-3 gap-1 pt-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-8 animate-pulse rounded bg-card" />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Desktop skeleton */}
      <div className="hidden md:block">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-border bg-background px-4 py-3 last:border-0"
          >
            <div className="h-4 w-24 animate-pulse rounded bg-card" />
            <div className="h-4 w-12 animate-pulse rounded bg-card" />
            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-card" />
            <div className="h-4 w-20 animate-pulse rounded bg-card" />
            <div className="h-4 w-16 animate-pulse rounded bg-card" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function TransactionTable(props: Props) {
  if (props.skeleton) return <TransactionTableSkeleton />;
  return (
    <TransactionTableInner
      data={props.data}
      totalCount={props.totalCount}
      page={props.page}
      limit={props.limit}
    />
  );
}
