"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransactionAction } from "../api/create-transaction-action";
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
    date: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const total =
    form.priceUsd && form.quantity
      ? (Number(form.priceUsd) * Number(form.quantity)).toFixed(2)
      : null;

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
        date: new Date(form.date).toISOString(),
        notes: form.notes || undefined,
      });

      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push("/transactions");
    } catch (err) {
      console.error("[TransactionForm] action error:", err);
      setError("Error inesperado. Revisa la consola.");
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
        <div className="flex overflow-hidden rounded-lg border border-border">
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
