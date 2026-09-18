import { Suspense } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { TransactionFilters } from "@/features/transactions/components/TransactionFilters";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { TransactionTableServer } from "@/features/transactions/components/TransactionTableServer";
import { TransactionStats } from "@/features/transactions/components/TransactionStats";
import { TransactionSheet } from "@/features/transactions/components/TransactionSheet";
import { TransactionExport } from "@/features/transactions/components/TransactionExport";
import type { TransactionFilters as Filters } from "@/features/transactions/types";

const VALID_TYPES = ["buy", "sell"] as const;
const VALID_SOURCES = ["manual", "binance", "csv"] as const;
const VALID_SORTS = ["fecha_desc", "fecha_asc", "total_desc", "total_asc"] as const;

type PageProps = {
  searchParams: Promise<{
    assetId?: string;
    type?: string;
    source?: string;
    from?: string;
    to?: string;
    search?: string;
    sortBy?: string;
    page?: string;
  }>;
};

export default async function TransactionsPage({ searchParams }: PageProps) {
  const [params, assetList] = await Promise.all([
    searchParams,
    db.select().from(assets).orderBy(assets.symbol),
  ]);

  const filters: Filters = {
    assetId: params.assetId,
    type: (VALID_TYPES as readonly string[]).includes(params.type ?? "")
      ? (params.type as Filters["type"])
      : undefined,
    source: (VALID_SOURCES as readonly string[]).includes(params.source ?? "")
      ? (params.source as Filters["source"])
      : undefined,
    from: params.from,
    to: params.to,
    search: params.search,
    sortBy: (VALID_SORTS as readonly string[]).includes(params.sortBy ?? "")
      ? (params.sortBy as Filters["sortBy"])
      : undefined,
    page: params.page ? Number(params.page) : 1,
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-foreground md:text-xl">
          Transacciones
        </h1>
        <div className="flex items-center gap-2">
          <TransactionExport filters={filters} />
          <Link href="/transactions/import">
            <Button
              size="sm"
              variant="outline"
              className="hidden items-center gap-2 sm:flex"
            >
              <Upload size={14} />
              Importar Excel
            </Button>
          </Link>
          <TransactionSheet assets={assetList} />
        </div>
      </div>

      {/* Stats */}
      <Suspense fallback={<TransactionStats skeleton />}>
        <TransactionStats filters={filters} />
      </Suspense>

      {/* Filters */}
      <TransactionFilters current={filters} />

      {/* Table */}
      <Suspense fallback={<TransactionTable skeleton />}>
        <TransactionTableServer filters={filters} />
      </Suspense>
    </div>
  );
}
