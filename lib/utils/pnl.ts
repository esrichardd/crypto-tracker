export function calcAvgBuyPrice(
  transactions: { price: number; quantity: number }[],
): number {
  const totalCost = transactions.reduce(
    (sum, t) => sum + t.price * t.quantity,
    0,
  );
  const totalQty = transactions.reduce((sum, t) => sum + t.quantity, 0);
  return totalQty === 0 ? 0 : totalCost / totalQty;
}

export function calcUnrealizedPnl(
  avgBuyPrice: number,
  currentPrice: number,
  quantity: number,
): { absolute: number; percent: number } {
  const costBasis = avgBuyPrice * quantity;
  const currentValue = currentPrice * quantity;
  return {
    absolute: currentValue - costBasis,
    percent:
      costBasis === 0 ? 0 : ((currentValue - costBasis) / costBasis) * 100,
  };
}
