export type TransactionFilters = {
  assetId?: string;
  type?: "buy" | "sell";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type TransactionRow = {
  id: string;
  type: "buy" | "sell";
  priceUsd: string;
  quantity: string;
  fee: string;
  date: Date;
  notes: string | null;
  source: "manual" | "binance" | "csv";
  createdAt: Date;
  asset: {
    id: string;
    symbol: string;
    name: string;
    logoUrl: string | null;
  };
};

export type CreateTransactionInput = {
  assetId: string;
  type: "buy" | "sell";
  priceUsd: string;
  quantity: string;
  fee?: string;
  date: string;
  notes?: string;
};
