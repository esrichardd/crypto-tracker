import { requireSession } from "@/lib/auth/server";
import { formatUSD } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { getTransactionStats } from "../api/get-transaction-stats";
import type { TransactionFilters } from "../types";

type Props =
  | { skeleton: true }
  | {
      skeleton?: false;
      filters: Pick<TransactionFilters, "type" | "from" | "to">;
    };

function StatCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 md:p-4">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-base font-medium md:text-lg", valueClass)}>
        {value}
      </span>
      <span className="text-[10px] text-secondary">{sub}</span>
    </div>
  );
}

async function TransactionStatsInner({
  filters,
}: {
  filters: Pick<TransactionFilters, "type" | "from" | "to">;
}) {
  const session = await requireSession();
  const stats = await getTransactionStats(session.user.id, filters);

  const net = stats.totalSold - stats.totalInvested;
  const netPositive = net >= 0;

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
      <StatCard
        label="Total invertido"
        value={formatUSD(stats.totalInvested)}
        sub={`${stats.buyCount} compras`}
      />
      <StatCard
        label="Total vendido"
        value={formatUSD(stats.totalSold)}
        sub={`${stats.sellCount} ventas`}
      />
      <StatCard
        label="Neto realizado"
        value={(netPositive ? "+" : "") + formatUSD(net)}
        sub="vendido − invertido"
        valueClass={netPositive ? "text-success" : "text-danger"}
      />
      <StatCard
        label="Fees totales"
        value={formatUSD(stats.totalFees)}
        sub="en todas las ops"
        valueClass="text-muted-foreground"
      />
    </div>
  );
}

export function TransactionStats(props: Props) {
  if (props.skeleton) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[76px] animate-pulse rounded-lg border border-border bg-card md:h-[84px]"
          />
        ))}
      </div>
    );
  }

  return <TransactionStatsInner filters={props.filters} />;
}
