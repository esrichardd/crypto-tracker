"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
  | { skeleton?: false; data: SerializedTransactionRow[] };

function TransactionTableInner({ data }: { data: SerializedTransactionRow[] }) {
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
