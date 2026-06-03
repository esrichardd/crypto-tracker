import { formatUSD } from "@/lib/utils/formatters";
import { PnlBadge } from "./PnlBadge";
import type { PortfolioData } from "../types";

type Props =
  | { skeleton: true }
  | {
      skeleton?: false;
      data: Pick<
        PortfolioData,
        "totalValueUsd" | "totalPnlAbsolute" | "totalPnlPercent"
      >;
    };

export function PortfolioSummary(props: Props) {
  if (props.skeleton) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 animate-pulse rounded bg-card" />
        <div className="h-10 w-56 animate-pulse rounded bg-card" />
        <div className="h-5 w-24 animate-pulse rounded bg-card" />
      </div>
    );
  }

  const { totalValueUsd, totalPnlAbsolute, totalPnlPercent } = props.data;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">Valor total del portfolio</p>
      <p className="text-4xl font-bold text-foreground">
        {formatUSD(totalValueUsd)}
      </p>
      <PnlBadge absolute={totalPnlAbsolute} percent={totalPnlPercent} />
    </div>
  );
}
