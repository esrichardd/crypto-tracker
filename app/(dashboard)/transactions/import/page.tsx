import { Suspense } from "react";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { ExcelImport } from "@/features/transactions/components/ExcelImport";

async function ExcelImportData() {
  const assetList = await db.select().from(assets).orderBy(assets.symbol);
  return <ExcelImport assets={assetList} />;
}

export default function ImportTransactionsPage() {
  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground md:text-xl">
            Importar transacciones
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sube un Excel con tus operaciones en lote
          </p>
        </div>
      </div>
      <Suspense fallback={<ExcelImport skeleton />}>
        <ExcelImportData />
      </Suspense>
    </div>
  );
}
