"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
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
