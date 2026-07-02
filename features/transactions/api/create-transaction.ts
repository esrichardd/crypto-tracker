import { db } from "@/lib/db";
import { transactions, assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Transaction } from "@/lib/db/schema";
import type { CreateTransactionSchema } from "./transaction-schema";

export async function createTransaction(
  userId: string,
  input: CreateTransactionSchema,
): Promise<Transaction> {
  // Verify asset exists
  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, input.assetId),
  });
  if (!asset) throw new Error("Not found");

  const [created] = await db
    .insert(transactions)
    .values({
      userId,
      assetId: input.assetId,
      type: input.type,
      priceUsd: input.priceUsd,
      quantity: input.quantity,
      fee: input.fee ?? "0",
      date: input.date,
      notes: input.notes ?? null,
      source: "manual",
    })
    .returning();

  return created;
}
