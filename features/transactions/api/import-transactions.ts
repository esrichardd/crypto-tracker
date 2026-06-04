"use server";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/server";
import type { ImportRowInput } from "./import-schema";

export type ImportResult = {
  inserted: number;
  skipped: number;
  error?: string;
};

export async function importTransactionsAction(
  rows: ImportRowInput[],
): Promise<ImportResult> {
  const session = await requireSession();
  const userId = session.user.id;

  if (rows.length === 0) return { inserted: 0, skipped: 0 };
  if (rows.length > 500)
    return {
      inserted: 0,
      skipped: 0,
      error: "Máximo 500 filas por importación.",
    };

  const values = rows.map((row) => ({
    userId,
    assetId: row.assetId,
    type: row.type,
    priceUsd: row.priceUsd,
    quantity: row.quantity,
    fee: row.fee ?? "0",
    date: new Date(row.date),
    notes: row.notes ?? null,
    source: "csv" as const,
    externalId: row.externalId,
  }));

  // Insert all rows; duplicates (same source + externalId) are silently skipped.
  const result = await db
    .insert(transactions)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: transactions.id });

  return {
    inserted: result.length,
    skipped: rows.length - result.length,
  };
}
