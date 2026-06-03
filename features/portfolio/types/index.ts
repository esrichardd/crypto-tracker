export type Holding = {
  asset: {
    id: string;
    symbol: string;
    name: string;
    coingeckoId: string;
    logoUrl: string | null;
  };
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  pnlAbsolute: number;
  pnlPercent: number;
};

export type PortfolioData = {
  totalValueUsd: number;
  totalCostBasis: number;
  totalPnlAbsolute: number;
  totalPnlPercent: number;
  holdings: Holding[];
};
