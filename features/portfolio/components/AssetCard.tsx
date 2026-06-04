import Image from "next/image";
import { formatUSD, formatCrypto } from "@/lib/utils/formatters";
import { PnlBadge } from "./PnlBadge";
import type { Holding } from "../types";

type HoldingWithAllocation = Holding & { allocationPercent: number };

type Props = { skeleton: true } | { skeleton?: false; data: HoldingWithAllocation };

// Accent color per well-known symbol — fallback to primary
const SYMBOL_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
  BNB: "#f0b90b",
  XRP: "#346aa9",
  ADA: "#0033ad",
  DOGE: "#c2a633",
  DOT: "#e6007a",
  MATIC: "#8247e5",
  AVAX: "#e84142",
  LINK: "#2a5ada",
  UNI: "#ff007a",
  LTC: "#bfbbbb",
  ATOM: "#2e3148",
  NEAR: "#00c08b",
};

function getAccentColor(symbol: string): string {
  return SYMBOL_COLORS[symbol.toUpperCase()] ?? "var(--color-primary)";
}

export function AssetCard(props: Props) {
  if (props.skeleton) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-14 animate-pulse rounded bg-muted" />
            <div className="h-3 w-10 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="mt-3 h-1 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const {
    asset,
    quantity,
    costBasis,
    currentPrice,
    currentValue,
    pnlAbsolute,
    pnlPercent,
    allocationPercent,
  } = props.data;

  const accentColor = getAccentColor(asset.symbol);
  const allocationClamped = Math.min(Math.max(allocationPercent, 0), 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {asset.logoUrl ? (
            <Image
              src={asset.logoUrl}
              alt={asset.symbol}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                backgroundColor: `${accentColor}22`,
                color: accentColor,
              }}
            >
              {asset.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {asset.symbol}
            </p>
            <p className="text-xs text-muted-foreground">{asset.name}</p>
          </div>
        </div>
        <PnlBadge absolute={pnlAbsolute} percent={pnlPercent} compact />
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Cantidad</p>
          <p className="font-mono text-foreground">{formatCrypto(quantity)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Valor actual</p>
          <p className="font-mono font-semibold text-foreground">
            {formatUSD(currentValue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Precio</p>
          <p className="font-mono text-foreground">{formatUSD(currentPrice)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Invertido</p>
          <p className="font-mono text-foreground">{formatUSD(costBasis)}</p>
        </div>
      </div>

      {/* Allocation bar */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Asignación</span>
          <span>{allocationClamped.toFixed(1)}%</span>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${allocationClamped}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
