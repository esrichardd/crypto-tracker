export type TransactionFilters = {
  assetId?: string;
  type?: "buy" | "sell";
  source?: "manual" | "binance" | "csv";
  from?: string;
  to?: string;
  search?: string;
  sortBy?: "fecha_desc" | "fecha_asc" | "total_desc" | "total_asc";
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

// Row after client-side parsing and validation
export type ImportPreviewRow = {
  rowIndex: number; // 1-based row number in the Excel (for error messages)
  symbol: string;
  type: "buy" | "sell";
  priceUsd: string;
  quantity: string;
  fee: string;
  date: string; // ISO string after normalisation
  notes: string;
  assetId: string | null; // null = symbol not found in catalog
  error: string | null; // human-readable validation error, null = valid
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
