import type { TransactionFilters, TransactionRow } from "../types";

export async function fetchTransactions(
  filters: TransactionFilters = {},
): Promise<TransactionRow[]> {
  const params = new URLSearchParams();
  if (filters.assetId) params.set("assetId", filters.assetId);
  if (filters.type) params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const res = await fetch(`/api/transactions?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const json = await res.json();
  return json.data;
}
