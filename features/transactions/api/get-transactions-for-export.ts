import { and, asc, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, transactions } from "@/lib/db/schema";
import { isDateOnlyString } from "@/lib/utils/dates";
import type { TransactionFilters } from "../types";

export type ExportTransactionRow = {
  id: string;
  asset: {
    symbol: string;
    name: string;
  };
  type: "buy" | "sell";
  priceUsd: string;
  quantity: string;
  fee: string;
  totalUsd: string;
  date: string;
  source: "manual" | "binance" | "csv";
  notes: string | null;
  createdAt: Date;
};

/**
 * Returns a user's full transaction history, optionally matching the filters
 * shown in the transaction list. Exports intentionally do not paginate.
 */
export async function getTransactionsForExport(
  userId: string,
  filters: Omit<TransactionFilters, "page" | "limit"> = {},
): Promise<ExportTransactionRow[]> {
  const conditions = [eq(transactions.userId, userId)];

  if (filters.assetId)
    conditions.push(eq(transactions.assetId, filters.assetId));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.source) conditions.push(eq(transactions.source, filters.source));
  if (filters.from && isDateOnlyString(filters.from))
    conditions.push(gte(transactions.date, filters.from));
  if (filters.to && isDateOnlyString(filters.to))
    conditions.push(lte(transactions.date, filters.to));
  if (filters.search)
    conditions.push(ilike(assets.symbol, `%${filters.search}%`));

  const totalExpr = sql<string>`(${transactions.priceUsd}::numeric * ${transactions.quantity}::numeric)::text`;
  const orderBy = (() => {
    switch (filters.sortBy) {
      case "fecha_asc":
        return asc(transactions.date);
      case "total_desc":
        return desc(totalExpr);
      case "total_asc":
        return asc(totalExpr);
      default:
        return desc(transactions.date);
    }
  })();

  const rows = await db
    .select({
      id: transactions.id,
      asset: {
        symbol: assets.symbol,
        name: assets.name,
      },
      type: transactions.type,
      priceUsd: transactions.priceUsd,
      quantity: transactions.quantity,
      fee: transactions.fee,
      totalUsd: totalExpr,
      date: transactions.date,
      source: transactions.source,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .innerJoin(assets, eq(transactions.assetId, assets.id))
    .where(and(...conditions))
    .orderBy(orderBy);

  return rows as ExportTransactionRow[];
}
