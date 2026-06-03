import Image from "next/image";
import { formatUSD, formatCrypto } from "@/lib/utils/formatters";
import { PnlBadge } from "./PnlBadge";
import type { Holding } from "../types";

type Props = { skeleton: true } | { skeleton?: false; data: Holding };

export function AssetCard(props: Props) {
  if (props.skeleton) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const {
    asset,
    quantity,
    avgBuyPrice,
    currentPrice,
    currentValue,
    pnlAbsolute,
    pnlPercent,
  } = props.data;

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {asset.logoUrl && (
            <Image
              src={asset.logoUrl}
              alt={asset.symbol}
              width={28}
              height={28}
              className="rounded-full"
            />
          )}
          <div>
            <p className="font-semibold text-foreground">{asset.symbol}</p>
            <p className="text-xs text-muted-foreground">{asset.name}</p>
          </div>
        </div>
        <PnlBadge absolute={pnlAbsolute} percent={pnlPercent} compact />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
        <div>
          <p className="text-muted-foreground">Cantidad</p>
          <p className="font-mono text-foreground">{formatCrypto(quantity)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Valor actual</p>
          <p className="font-mono font-semibold text-foreground">
            {formatUSD(currentValue)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Precio actual</p>
          <p className="font-mono text-foreground">{formatUSD(currentPrice)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Precio promedio</p>
          <p className="font-mono text-foreground">{formatUSD(avgBuyPrice)}</p>
        </div>
      </div>
    </div>
  );
}
