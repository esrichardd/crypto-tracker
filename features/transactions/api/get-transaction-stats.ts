import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { isDateOnlyString } from "@/lib/utils/dates";
import type { TransactionFilters } from "../types";

export type TransactionStats = {
  totalInvested: number;
  buyCount: number;
  totalSold: number;
  sellCount: number;
  totalFees: number;
  totalCount: number;
};

export async function getTransactionStats(
  userId: string,
  filters: Pick<TransactionFilters, "type" | "from" | "to"> = {},
): Promise<TransactionStats> {
  const conditions = [eq(transactions.userId, userId)];
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.from && isDateOnlyString(filters.from))
    conditions.push(gte(transactions.date, filters.from));
  if (filters.to && isDateOnlyString(filters.to))
    conditions.push(lte(transactions.date, filters.to));

  const rows = await db
    .select({
      type: transactions.type,
      total: sql<string>`sum(${transactions.priceUsd}::numeric * ${transactions.quantity}::numeric)`,
      fees: sql<string>`sum(${transactions.fee}::numeric)`,
      cnt: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(transactions.type);

  let totalInvested = 0;
  let buyCount = 0;
  let totalSold = 0;
  let sellCount = 0;
  let totalFees = 0;
  let totalCount = 0;

  for (const row of rows) {
    const rowTotal = Number(row.total ?? 0);
    const rowFees = Number(row.fees ?? 0);
    const rowCount = Number(row.cnt ?? 0);
    totalFees += rowFees;
    totalCount += rowCount;
    if (row.type === "buy") {
      totalInvested = rowTotal;
      buyCount = rowCount;
    } else {
      totalSold = rowTotal;
      sellCount = rowCount;
    }
  }

  return { totalInvested, buyCount, totalSold, sellCount, totalFees, totalCount };
}
