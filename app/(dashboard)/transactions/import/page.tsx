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
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Importar transacciones
      </h1>
      <Suspense fallback={<ExcelImport skeleton />}>
        <ExcelImportData />
      </Suspense>
    </div>
  );
}
