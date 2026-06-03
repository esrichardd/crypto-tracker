import { cache } from "react";
import { db } from "@/lib/db";
import { transactions, assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPrices } from "@/lib/coingecko/client";
import { calcAvgBuyPrice, calcUnrealizedPnl } from "@/lib/utils/pnl";
import type { PortfolioData, Holding } from "../types";

export const getPortfolio = cache(async (userId: string): Promise<PortfolioData> => {
  const rows = await db
    .select({
      type: transactions.type,
      priceUsd: transactions.priceUsd,
      quantity: transactions.quantity,
      asset: {
        id: assets.id,
        symbol: assets.symbol,
        name: assets.name,
        coingeckoId: assets.coingeckoId,
        logoUrl: assets.logoUrl,
      },
    })
    .from(transactions)
    .innerJoin(assets, eq(transactions.assetId, assets.id))
    .where(eq(transactions.userId, userId));

  if (rows.length === 0) {
    return {
      totalValueUsd: 0,
      totalCostBasis: 0,
      totalPnlAbsolute: 0,
      totalPnlPercent: 0,
      holdings: [],
    };
  }

  // Aggregate per asset
  const map = new Map<
    string,
    {
      asset: (typeof rows)[0]["asset"];
      buyTxs: { price: number; quantity: number }[];
      netQty: number;
    }
  >();

  for (const row of rows) {
    const key = row.asset.id;
    if (!map.has(key))
      map.set(key, { asset: row.asset, buyTxs: [], netQty: 0 });
    const h = map.get(key)!;
    const qty = Number(row.quantity);
    const price = Number(row.priceUsd);
    if (row.type === "buy") {
      h.netQty += qty;
      h.buyTxs.push({ price, quantity: qty });
    } else {
      h.netQty -= qty;
    }
  }

  // Fetch live prices in parallel
  const coingeckoIds = [...map.values()].map((h) => h.asset.coingeckoId);
  const prices = await getPrices(coingeckoIds);

  const holdings: Holding[] = [];
  let totalValueUsd = 0;
  let totalCostBasis = 0;

  for (const [, h] of map) {
    if (h.netQty <= 0) continue;
    const avgBuyPrice = calcAvgBuyPrice(h.buyTxs);
    const currentPrice = prices[h.asset.coingeckoId] ?? 0;
    const { absolute: pnlAbsolute, percent: pnlPercent } = calcUnrealizedPnl(
      avgBuyPrice,
      currentPrice,
      h.netQty,
    );
    const costBasis = avgBuyPrice * h.netQty;
    const currentValue = currentPrice * h.netQty;

    totalValueUsd += currentValue;
    totalCostBasis += costBasis;

    holdings.push({
      asset: h.asset,
      quantity: h.netQty,
      avgBuyPrice,
      currentPrice,
      currentValue,
      costBasis,
      pnlAbsolute,
      pnlPercent,
    });
  }

  const totalPnlAbsolute = totalValueUsd - totalCostBasis;
  const totalPnlPercent =
    totalCostBasis === 0 ? 0 : (totalPnlAbsolute / totalCostBasis) * 100;

  return {
    totalValueUsd,
    totalCostBasis,
    totalPnlAbsolute,
    totalPnlPercent,
    holdings,
  };
});
