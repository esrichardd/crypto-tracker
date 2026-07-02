"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown, Search, ArrowUp, ArrowDown, X } from "lucide-react";
import { createTransactionAction } from "../api/create-transaction-action";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { todayDateOnly } from "@/lib/utils/dates";
import { formatUSD } from "@/lib/utils/formatters";
import type { Asset } from "@/lib/db/schema";

type Props = {
  assets: Asset[];
  onSuccess?: () => void;
  onCancel?: () => void;
};

// ─── Asset logo ───────────────────────────────────────────────────────────────

function AssetLogo({
  asset,
  size = 28,
}: {
  asset: Asset;
  size?: number;
}) {
  if (asset.logoUrl) {
    return (
      <Image
        src={asset.logoUrl}
        alt={asset.symbol}
        width={size}
        height={size}
        className="rounded-full"
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-card text-[10px] font-semibold text-muted-foreground"
      style={{ width: size, height: size }}
    >
      {asset.symbol.slice(0, 2)}
    </div>
  );
}

// ─── Asset combobox ───────────────────────────────────────────────────────────

function AssetCombobox({
  assets,
  value,
  onChange,
}: {
  assets: Asset[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = assets.find((a) => a.id === value) ?? assets[0];

  const filtered = useMemo(
    () =>
      query
        ? assets.filter(
            (a) =>
              a.symbol.toLowerCase().includes(query.toLowerCase()) ||
              a.name.toLowerCase().includes(query.toLowerCase()),
          )
        : assets,
    [assets, query],
  );

  useEffect(() => {
    if (!open) return;
    // focus search on open
    setTimeout(() => searchRef.current?.focus(), 50);
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-border-strong focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {selected && <AssetLogo asset={selected} size={24} />}
        <div className="flex-1">
          <span className="text-sm font-medium text-foreground">
            {selected?.symbol}
          </span>
          <span className="ml-1.5 text-xs text-muted-foreground">
            {selected?.name}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-secondary transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-border bg-card">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={13} className="shrink-0 text-secondary" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cripto…"
              style={{ fontSize: "16px" }}
              className="flex-1 bg-transparent text-foreground placeholder:text-secondary focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-secondary hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Sin resultados
              </p>
            ) : (
              filtered.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => select(asset.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-card-hover",
                    asset.id === value && "bg-primary/5",
                  )}
                >
                  <AssetLogo asset={asset} size={22} />
                  <span className="text-sm font-medium text-foreground">
                    {asset.symbol}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {asset.name}
                  </span>
                  {asset.id === value && (
                    <span className="ml-auto text-xs text-primary">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function TransactionForm({ assets, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    assetId: assets[0]?.id ?? "",
    type: "buy" as "buy" | "sell",
    priceUsd: "",
    quantity: "",
    fee: "",
    date: todayDateOnly(),
    notes: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedAsset = assets.find((a) => a.id === form.assetId);
  const priceNum = parseFloat(form.priceUsd) || 0;
  const qtyNum = parseFloat(form.quantity) || 0;
  const total = priceNum > 0 && qtyNum > 0 ? priceNum * qtyNum : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await createTransactionAction({
        assetId: form.assetId,
        type: form.type,
        priceUsd: form.priceUsd,
        quantity: form.quantity,
        fee: form.fee || "0",
        date: form.date,
        notes: form.notes || undefined,
      });

      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (onSuccess) {
        router.refresh();
        onSuccess();
      } else {
        router.push("/transactions");
      }
    } catch (err) {
      console.error("[TransactionForm] error:", err);
      setError("Error inesperado. Intenta de nuevo.");
      setLoading(false);
    }
  }

  const submitLabel = loading
    ? "Guardando…"
    : total
      ? `Registrar ${form.type === "buy" ? "compra" : "venta"} · ${formatUSD(total)}`
      : form.type === "buy"
        ? "Registrar compra"
        : "Registrar venta";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* ── Buy / Sell toggle ── */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          onClick={() => set("type", "buy")}
          className={cn(
            "flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
            form.type === "buy"
              ? "bg-success/10 text-success"
              : "bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowUp size={14} aria-hidden />
          Compra
        </button>
        <button
          type="button"
          onClick={() => set("type", "sell")}
          className={cn(
            "flex items-center justify-center gap-2 border-l border-border py-3 text-sm font-medium transition-colors",
            form.type === "sell"
              ? "bg-danger/10 text-danger"
              : "bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowDown size={14} aria-hidden />
          Venta
        </button>
      </div>

      {/* ── Asset ── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="asset-trigger">Criptomoneda</Label>
        <AssetCombobox
          assets={assets}
          value={form.assetId}
          onChange={(id) => set("assetId", id)}
        />
      </div>

      {/* ── Price + Quantity ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priceUsd">Precio USD</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-secondary">
              $
            </span>
            <input
              id="priceUsd"
              type="number"
              step="any"
              min="0"
              value={form.priceUsd}
              onChange={(e) => set("priceUsd", e.target.value)}
              placeholder="0.00"
              required
              style={{ fontSize: "16px" }}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-6 pr-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quantity">Cantidad</Label>
          <div className="relative">
            <input
              id="quantity"
              type="number"
              step="any"
              min="0"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder="0"
              required
              style={{ fontSize: "16px" }}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-3 pr-10 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {selectedAsset && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-secondary">
                {selectedAsset.symbol}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Total callout ── */}
      {total ? (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-secondary">
              Total estimado
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {qtyNum} {selectedAsset?.symbol} × {formatUSD(priceNum)}
            </p>
          </div>
          <span className="font-mono text-lg font-medium text-primary">
            {formatUSD(total)}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
          <p className="text-xs text-secondary">
            Ingresa precio y cantidad para ver el total
          </p>
        </div>
      )}

      {/* ── Divider ── */}
      <div className="h-px bg-border" />

      {/* ── Fee + Date ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fee">
            Fee{" "}
            <span className="text-[10px] font-normal text-secondary">
              (opcional)
            </span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-secondary">
              $
            </span>
            <input
              id="fee"
              type="number"
              step="any"
              min="0"
              value={form.fee}
              onChange={(e) => set("fee", e.target.value)}
              placeholder="0.00"
              style={{ fontSize: "16px" }}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-6 pr-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Fecha</Label>
          <input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            required
            style={{ fontSize: "16px" }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">
          Notas{" "}
          <span className="text-[10px] font-normal text-secondary">
            (opcional)
          </span>
        </Label>
        <input
          id="notes"
          type="text"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="DCA mensual, estrategia…"
          style={{ fontSize: "16px" }}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* ── Error ── */}
      {error && (
        <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full rounded-lg py-3 text-sm font-medium transition-opacity disabled:opacity-50",
            form.type === "buy"
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-danger text-white hover:opacity-90",
          )}
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel ?? (() => {})}
          className="w-full py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
