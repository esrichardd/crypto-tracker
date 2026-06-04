import { requireSession } from "@/lib/auth/server";
import { getPortfolio } from "../api/get-portfolio";
import { PortfolioSummary } from "./PortfolioSummary";
import type { Holding } from "../types";

function getBestHolding(holdings: Holding[]) {
  if (holdings.length === 0) return null;
  return holdings.reduce((best, h) => (h.pnlPercent > best.pnlPercent ? h : best));
}

export async function PortfolioSummaryData() {
  const session = await requireSession();
  const portfolio = await getPortfolio(session.user.id);

  return (
    <PortfolioSummary
      data={{
        totalValueUsd: portfolio.totalValueUsd,
        totalPnlAbsolute: portfolio.totalPnlAbsolute,
        totalPnlPercent: portfolio.totalPnlPercent,
      }}
      bestHolding={getBestHolding(portfolio.holdings)}
    />
  );
}
