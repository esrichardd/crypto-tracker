import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";

export default async function NewTransactionPage() {
  const assetList = await db.select().from(assets).orderBy(assets.symbol);

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Nueva transacción
      </h1>
      <TransactionForm assets={assetList} />
    </div>
  );
}
