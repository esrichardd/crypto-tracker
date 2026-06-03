import { requireSession } from "@/lib/auth/server";
import { getPortfolio } from "../api/get-portfolio";
import { PortfolioSummary } from "./PortfolioSummary";

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
    />
  );
}
