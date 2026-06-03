import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionFilters } from "@/features/transactions/components/TransactionFilters";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { TransactionTableServer } from "@/features/transactions/components/TransactionTableServer";
import type { TransactionFilters as Filters } from "@/features/transactions/types";

type PageProps = {
  searchParams: Promise<{
    assetId?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: Filters = {
    assetId: params.assetId,
    type:
      params.type === "buy" || params.type === "sell" ? params.type : undefined,
    from: params.from,
    to: params.to,
    page: params.page ? Number(params.page) : 1,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Transacciones</h1>
        <Link href="/transactions/new">
          <Button size="sm" className="flex items-center gap-2">
            <Plus size={14} />
            Nueva transacción
          </Button>
        </Link>
      </div>

      <TransactionFilters current={filters} />

      <Suspense fallback={<TransactionTable skeleton />}>
        <TransactionTableServer filters={filters} />
      </Suspense>
    </div>
  );
}
