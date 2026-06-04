import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";

export default async function NewTransactionPage() {
  const assetList = await db.select().from(assets).orderBy(assets.symbol);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-5 text-base font-semibold text-foreground">
        Nueva transacción
      </h1>
      <TransactionForm assets={assetList} />
    </div>
  );
}
