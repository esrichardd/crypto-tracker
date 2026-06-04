import { TrendingUp, TrendingDown, Minus, Wallet, Trophy } from "lucide-react";
import { formatUSD, formatPercent } from "@/lib/utils/formatters";
import type { PortfolioData, Holding } from "../types";

type BestHolding = Pick<Holding, "asset" | "pnlPercent"> | null;

type Props =
  | { skeleton: true }
  | {
      skeleton?: false;
      data: Pick<
        PortfolioData,
        "totalValueUsd" | "totalPnlAbsolute" | "totalPnlPercent"
      >;
      bestHolding: BestHolding;
    };

function PnlIndicator({ value }: { value: number }) {
  if (value > 0) return <TrendingUp size={13} className="text-success" />;
  if (value < 0) return <TrendingDown size={13} className="text-danger" />;
  return <Minus size={13} className="text-muted-foreground" />;
}

export function PortfolioSummary(props: Props) {
  if (props.skeleton) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  const { totalValueUsd, totalPnlAbsolute, totalPnlPercent } = props.data;
  const { bestHolding } = props;

  const pnlColor =
    totalPnlAbsolute > 0
      ? "text-success"
      : totalPnlAbsolute < 0
        ? "text-danger"
        : "text-muted-foreground";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Total value */}
      <div className="rounded-xl border border-primary/20 bg-card p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wallet size={12} />
          Valor total
        </p>
        <p className="font-mono text-2xl font-semibold text-foreground">
          {formatUSD(totalValueUsd)}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          Portafolio actualizado
        </p>
      </div>

      {/* P&L */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <PnlIndicator value={totalPnlAbsolute} />
          P&amp;L total
        </p>
        <p className={`font-mono text-2xl font-semibold ${pnlColor}`}>
          {formatUSD(totalPnlAbsolute)}
        </p>
        <p className={`mt-1 text-xs ${pnlColor}`}>
          {formatPercent(totalPnlPercent)} desde inicio
        </p>
      </div>

      {/* Best performer */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Trophy size={12} />
          Mejor activo
        </p>
        {bestHolding ? (
          <>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold text-foreground">
                {bestHolding.asset.symbol}
              </p>
            </div>
            <p className="mt-1 text-xs text-success">
              {formatPercent(bestHolding.pnlPercent)} P&amp;L
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Sin activos</p>
        )}
      </div>
    </div>
  );
}
