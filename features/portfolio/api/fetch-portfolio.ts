import type { PortfolioData } from "../types";

export async function fetchPortfolio(): Promise<PortfolioData> {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  const json = await res.json();
  return json.data;
}
