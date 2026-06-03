import { db } from "@/lib/db";
import { exchangeApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { ExchangeApiKey } from "../types";

export async function getBinanceApiKey(
  userId: string,
): Promise<ExchangeApiKey | null> {
  const result = await db
    .select({
      id: exchangeApiKeys.id,
      exchange: exchangeApiKeys.exchange,
      apiKeyHint: exchangeApiKeys.apiKeyHint,
      createdAt: exchangeApiKeys.createdAt,
      updatedAt: exchangeApiKeys.updatedAt,
    })
    .from(exchangeApiKeys)
    .where(
      and(
        eq(exchangeApiKeys.userId, userId),
        eq(exchangeApiKeys.exchange, "binance"),
      ),
    )
    .limit(1);

  return result[0]
    ? {
        ...result[0],
        createdAt: result[0].createdAt.toISOString(),
        updatedAt: result[0].updatedAt.toISOString(),
      }
    : null;
}
