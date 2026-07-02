import { db } from "@/lib/db";
import { transactions, assets } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/server";
import { and, eq, gte, lte, desc, asc, ilike, sql } from "drizzle-orm";
import { isDateOnlyString } from "@/lib/utils/dates";
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
  if (filters.source) conditions.push(eq(transactions.source, filters.source));
  if (filters.from && isDateOnlyString(filters.from))
    conditions.push(gte(transactions.date, filters.from));
  if (filters.to && isDateOnlyString(filters.to))
    conditions.push(lte(transactions.date, filters.to));
  if (filters.search)
    conditions.push(ilike(assets.symbol, `%${filters.search}%`));

  const limit = filters.limit ?? 20;
  const page = filters.page ?? 1;
  const offset = (page - 1) * limit;

  const totalExpr = sql`${transactions.priceUsd}::numeric * ${transactions.quantity}::numeric`;

  const orderBy = (() => {
    switch (filters.sortBy) {
      case "fecha_asc":  return asc(transactions.date);
      case "total_desc": return desc(totalExpr);
      case "total_asc":  return asc(totalExpr);
      default:           return desc(transactions.date);
    }
  })();

  const [rows, countResult] = await Promise.all([
    db
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
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .innerJoin(assets, eq(transactions.assetId, assets.id))
      .where(and(...conditions)),
  ]);

  const totalCount = countResult[0]?.count ?? 0;

  return (
    <TransactionTable
      data={rows}
      totalCount={totalCount}
      page={page}
      limit={limit}
    />
  );
}
