import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatUSD, formatPercent } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

type Props = {
  absolute: number;
  percent: number;
  compact?: boolean;
};

export function PnlBadge({ absolute, percent, compact = false }: Props) {
  const isPositive = absolute > 0;
  const isNegative = absolute < 0;

  const colorClass = isPositive
    ? "text-green-400"
    : isNegative
      ? "text-red-400"
      : "text-muted-foreground";

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div
      className={cn("flex items-center gap-1 text-sm font-medium", colorClass)}
    >
      <Icon size={14} />
      {compact ? (
        <span>{formatPercent(percent)}</span>
      ) : (
        <span>
          {formatUSD(absolute)} ({formatPercent(percent)})
        </span>
      )}
    </div>
  );
}
