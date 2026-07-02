export type OpportunityLot = {
  id: string;
  asset: {
    id: string;
    symbol: string;
    name: string;
    logoUrl: string | null;
  };
  buyDate: string;
  daysHeld: number;
  originalQuantity: number;
  remainingQuantity: number;
  soldQuantity: number;
  buyPriceUsd: number;
  unitCostBasis: number;
  remainingCostBasis: number;
  currentPriceUsd: number;
  currentValueUsd: number;
  pnlAbsolute: number;
  pnlPercent: number;
  annualizedPnlPercent: number | null;
  breakEvenPriceUsd: number;
};

export type OpportunitiesData = {
  asOfDate: string;
  lots: OpportunityLot[];
};
