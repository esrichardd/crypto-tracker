import { Suspense } from "react";
import { OpportunitiesData } from "@/features/opportunities/components/OpportunitiesData";
import { OpportunitiesSkeleton } from "@/features/opportunities/components/OpportunitiesSkeleton";

export default function OpportunitiesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Oportunidades</h1>
        <p className="text-sm text-muted-foreground">
          Compras abiertas evaluadas contra el precio actual.
        </p>
      </div>

      <Suspense fallback={<OpportunitiesSkeleton />}>
        <OpportunitiesData />
      </Suspense>
    </div>
  );
}
