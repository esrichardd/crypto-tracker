import { Suspense } from "react";
import { PortfolioSummary } from "@/features/portfolio/components/PortfolioSummary";
import { PortfolioSummaryData } from "@/features/portfolio/components/PortfolioSummaryData";
import { AssetCard } from "@/features/portfolio/components/AssetCard";
import { AssetCardsData } from "@/features/portfolio/components/AssetCardsData";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Suspense fallback={<PortfolioSummary skeleton />}>
        <PortfolioSummaryData />
      </Suspense>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense
          fallback={
            <>
              <AssetCard skeleton />
              <AssetCard skeleton />
              <AssetCard skeleton />
            </>
          }
        >
          <AssetCardsData />
        </Suspense>
      </section>
    </div>
  );
}
