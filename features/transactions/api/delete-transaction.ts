import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function deleteTransaction(
  userId: string,
  transactionId: string,
): Promise<void> {
  const deleted = await db
    .delete(transactions)
    .where(
      and(eq(transactions.id, transactionId), eq(transactions.userId, userId)),
    )
    .returning();

  if (deleted.length === 0) throw new Error("Not found");
}
