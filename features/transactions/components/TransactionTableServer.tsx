import { db } from "@/lib/db";
import { transactions, assets } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/server";
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { TransactionTable } from "./TransactionTable";
import type { TransactionFilters } from "../types";

export async function TransactionTableServer({
  filters,
}: {
  filters: TransactionFilters;
}) {
  const session = await requireSession();
  const userId = session.user.id;

  const conditions = [eq(transactions.userId, userId)];
  if (filters.assetId)
    conditions.push(eq(transactions.assetId, filters.assetId));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.from)
    conditions.push(gte(transactions.date, new Date(filters.from)));
  if (filters.to) conditions.push(lte(transactions.date, new Date(filters.to)));

  const limit = filters.limit ?? 20;
  const offset = ((filters.page ?? 1) - 1) * limit;

  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      priceUsd: transactions.priceUsd,
      quantity: transactions.quantity,
      fee: transactions.fee,
      date: transactions.date,
      notes: transactions.notes,
      source: transactions.source,
      createdAt: transactions.createdAt,
      asset: {
        id: assets.id,
        symbol: assets.symbol,
        name: assets.name,
        logoUrl: assets.logoUrl,
      },
    })
    .from(transactions)
    .innerJoin(assets, eq(transactions.assetId, assets.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date))
    .limit(limit)
    .offset(offset);

  return <TransactionTable data={rows} />;
}
