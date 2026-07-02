"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateOnlyFromLocalDate, todayDateOnly } from "@/lib/utils/dates";
import type { TransactionFilters } from "../types";

type Props = {
  current: TransactionFilters;
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  return dateOnlyFromLocalDate(date)!;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

type Period = "hoy" | "7d" | "30d" | "90d" | "custom" | "";

function detectPeriod(from?: string, to?: string): Period {
  if (!from && !to) return "";
  const today = todayDateOnly();
  if (from === today && (!to || to === today)) return "hoy";
  if (from === daysAgo(7) && (!to || to === today)) return "7d";
  if (from === daysAgo(30) && (!to || to === today)) return "30d";
  if (from === daysAgo(90) && (!to || to === today)) return "90d";
  return "custom";
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ─── Row label ────────────────────────────────────────────────────────────────

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 text-[10px] uppercase tracking-wide text-secondary">
      {children}
    </span>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "buy", label: "Compra" },
  { value: "sell", label: "Venta" },
] as const;

const SOURCE_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "manual", label: "Manual" },
  { value: "binance", label: "Binance" },
  { value: "csv", label: "CSV" },
] as const;

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "custom", label: "Personalizado" },
];

const SORT_OPTIONS = [
  { value: "fecha_desc", label: "Fecha: reciente" },
  { value: "fecha_asc", label: "Fecha: antigua" },
  { value: "total_desc", label: "Total ↓" },
  { value: "total_asc", label: "Total ↑" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionFilters({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [type, setType] = useState(current.type ?? "");
  const [source, setSource] = useState(current.source ?? "");
  const [search, setSearch] = useState(current.search ?? "");
  const [sortBy, setSortBy] = useState(current.sortBy ?? "fecha_desc");
  const [period, setPeriod] = useState<Period>(
    detectPeriod(current.from, current.to),
  );
  const [from, setFrom] = useState(current.from ?? "");
  const [to, setTo] = useState(current.to ?? "");

  function buildAndPush(overrides: Partial<TransactionFilters> = {}) {
    const merged: TransactionFilters = {
      type: (type as TransactionFilters["type"]) || undefined,
      source: (source as TransactionFilters["source"]) || undefined,
      from: from || undefined,
      to: to || undefined,
      search: search || undefined,
      sortBy: sortBy !== "fecha_desc"
        ? (sortBy as TransactionFilters["sortBy"])
        : undefined,
      ...overrides,
    };
    const p = new URLSearchParams();
    if (merged.type) p.set("type", merged.type);
    if (merged.source) p.set("source", merged.source);
    if (merged.from) p.set("from", merged.from);
    if (merged.to) p.set("to", merged.to);
    if (merged.search) p.set("search", merged.search);
    if (merged.sortBy) p.set("sortBy", merged.sortBy);
    router.push(`${pathname}?${p.toString()}`);
  }

  function selectType(v: string) {
    setType(v);
    buildAndPush({ type: (v as TransactionFilters["type"]) || undefined });
  }

  function selectSource(v: string) {
    setSource(v);
    buildAndPush({ source: (v as TransactionFilters["source"]) || undefined });
  }

  function selectPeriod(p: Period) {
    setPeriod(p);
    if (p === "custom") return;
    if (p === "") {
      setFrom(""); setTo("");
      buildAndPush({ from: undefined, to: undefined });
      return;
    }
    const today = todayDateOnly();
    const days: Record<string, number> = { hoy: 0, "7d": 7, "30d": 30, "90d": 90 };
    const newFrom = daysAgo(days[p] ?? 0);
    setFrom(newFrom);
    setTo(today);
    buildAndPush({ from: newFrom, to: today });
  }

  function selectSort(v: string) {
    setSortBy(v as NonNullable<TransactionFilters["sortBy"]>);
    buildAndPush({
      sortBy: v !== "fecha_desc"
        ? (v as TransactionFilters["sortBy"])
        : undefined,
    });
  }

  function clearAll() {
    setType(""); setSource(""); setFrom(""); setTo("");
    setSearch(""); setSortBy("fecha_desc"); setPeriod("");
    router.push(pathname);
  }

  const hasFilters = !!(
    type || source || from || to || search || sortBy !== "fecha_desc"
  );

  // font-size 16px on all inputs/selects — previene auto-zoom en iOS Safari
  const iosInputStyle = { fontSize: "16px" } as const;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">

      {/* ── Tipo + Fuente ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">

        <div className="flex items-center gap-2">
          <RowLabel>Tipo</RowLabel>
          <div className="flex gap-1">
            {TYPE_OPTIONS.map((o) => (
              <Pill key={o.value} active={type === o.value} onClick={() => selectType(o.value)}>
                {o.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="hidden h-4 w-px bg-border sm:block" />

        <div className="flex items-center gap-2">
          <RowLabel>Fuente</RowLabel>
          <div className="flex gap-1">
            {SOURCE_OPTIONS.map((o) => (
              <Pill key={o.value} active={source === o.value} onClick={() => selectSource(o.value)}>
                {o.label}
              </Pill>
            ))}
          </div>
        </div>

      </div>

      {/* ── Fecha ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <RowLabel>Fecha</RowLabel>
        <div className="flex flex-wrap gap-1">
          {PERIOD_OPTIONS.map((o) => (
            <Pill key={o.value} active={period === o.value} onClick={() => selectPeriod(o.value)}>
              {o.label}
            </Pill>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={iosInputStyle}
              className="rounded-lg border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-secondary">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={iosInputStyle}
              className="rounded-lg border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={() => buildAndPush({ from: from || undefined, to: to || undefined })}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* ── Buscar + Ordenar + Limpiar ─────────────────── */}
      <div className="flex items-center gap-2">

        {/* Search — 16px previene zoom en iOS */}
        <div className="relative flex-1">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary"
          />
          <input
            type="search"
            inputMode="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") buildAndPush({ search: search || undefined });
            }}
            placeholder="Buscar activo… (Enter)"
            style={iosInputStyle}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-foreground placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Sort */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5">
          <ArrowUpDown size={12} className="shrink-0 text-secondary" aria-hidden />
          <select
            value={sortBy}
            onChange={(e) => selectSort(e.target.value)}
            style={iosInputStyle}
            className="appearance-none bg-transparent text-foreground focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="shrink-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Limpiar
          </button>
        )}

      </div>
    </div>
  );
}
