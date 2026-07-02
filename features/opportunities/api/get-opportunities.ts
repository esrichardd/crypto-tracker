import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, transactions } from "@/lib/db/schema";
import { getPrices } from "@/lib/coingecko/client";
import { daysBetweenDateOnly, todayDateOnly } from "@/lib/utils/dates";
import type { OpportunitiesData, OpportunityLot } from "../types";

type BuyLot = {
  id: string;
  asset: {
    id: string;
    symbol: string;
    name: string;
    logoUrl: string | null;
  };
  coingeckoId: string;
  date: string;
  originalQuantity: number;
  remainingQuantity: number;
  buyPriceUsd: number;
  unitCostBasis: number;
};

function calcAnnualizedReturn(roiPercent: number, daysHeld: number) {
  if (daysHeld <= 0 || roiPercent <= -100) return null;
  return (Math.pow(1 + roiPercent / 100, 365 / daysHeld) - 1) * 100;
}

export const getOpportunities = cache(
  async (userId: string): Promise<OpportunitiesData> => {
    const rows = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        priceUsd: transactions.priceUsd,
        quantity: transactions.quantity,
        fee: transactions.fee,
        date: transactions.date,
        createdAt: transactions.createdAt,
        asset: {
          id: assets.id,
          symbol: assets.symbol,
          name: assets.name,
          logoUrl: assets.logoUrl,
          coingeckoId: assets.coingeckoId,
        },
      })
      .from(transactions)
      .innerJoin(assets, eq(transactions.assetId, assets.id))
      .where(eq(transactions.userId, userId))
      .orderBy(asc(transactions.date), asc(transactions.createdAt));

    if (rows.length === 0) {
      return { asOfDate: todayDateOnly(), lots: [] };
    }

    const lotsByAsset = new Map<string, BuyLot[]>();

    for (const row of rows) {
      const assetLots = lotsByAsset.get(row.asset.id) ?? [];
      lotsByAsset.set(row.asset.id, assetLots);

      const quantity = Number(row.quantity);
      const priceUsd = Number(row.priceUsd);
      const fee = Number(row.fee);

      if (row.type === "buy") {
        const totalCost = priceUsd * quantity + fee;
        assetLots.push({
          id: row.id,
          asset: {
            id: row.asset.id,
            symbol: row.asset.symbol,
            name: row.asset.name,
            logoUrl: row.asset.logoUrl,
          },
          coingeckoId: row.asset.coingeckoId,
          date: row.date,
          originalQuantity: quantity,
          remainingQuantity: quantity,
          buyPriceUsd: priceUsd,
          unitCostBasis: quantity === 0 ? priceUsd : totalCost / quantity,
        });
        continue;
      }

      let quantityToConsume = quantity;
      for (const lot of assetLots) {
        if (quantityToConsume <= 0) break;
        if (lot.remainingQuantity <= 0) continue;

        const consumed = Math.min(lot.remainingQuantity, quantityToConsume);
        lot.remainingQuantity -= consumed;
        quantityToConsume -= consumed;
      }
    }

    const activeLots = [...lotsByAsset.values()]
      .flat()
      .filter((lot) => lot.remainingQuantity > 0.00000001);
    const coingeckoIds = [...new Set(activeLots.map((lot) => lot.coingeckoId))];
    const prices = await getPrices(coingeckoIds);
    const asOfDate = todayDateOnly();

    const lots: OpportunityLot[] = activeLots.map((lot) => {
      const currentPriceUsd = prices[lot.coingeckoId] ?? 0;
      const remainingCostBasis = lot.unitCostBasis * lot.remainingQuantity;
      const currentValueUsd = currentPriceUsd * lot.remainingQuantity;
      const pnlAbsolute = currentValueUsd - remainingCostBasis;
      const pnlPercent =
        remainingCostBasis === 0
          ? 0
          : (pnlAbsolute / remainingCostBasis) * 100;
      const daysHeld = daysBetweenDateOnly(lot.date, asOfDate);

      return {
        id: lot.id,
        asset: lot.asset,
        buyDate: lot.date,
        daysHeld,
        originalQuantity: lot.originalQuantity,
        remainingQuantity: lot.remainingQuantity,
        soldQuantity: lot.originalQuantity - lot.remainingQuantity,
        buyPriceUsd: lot.buyPriceUsd,
        unitCostBasis: lot.unitCostBasis,
        remainingCostBasis,
        currentPriceUsd,
        currentValueUsd,
        pnlAbsolute,
        pnlPercent,
        annualizedPnlPercent: calcAnnualizedReturn(pnlPercent, daysHeld),
        breakEvenPriceUsd: lot.unitCostBasis,
      };
    });

    lots.sort((a, b) => b.pnlPercent - a.pnlPercent);

    return { asOfDate, lots };
  },
);
