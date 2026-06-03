const BASE = "https://api.coingecko.com/api/v3";

export async function getPrices(
  ids: string[],
): Promise<Record<string, number>> {
  if (ids.length === 0) return {};

  const res = await fetch(
    `${BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
    { next: { revalidate: 60 } }, // Next.js cache — revalidate every 60s
  );

  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);

  const json = (await res.json()) as Record<string, { usd: number }>;
  return Object.fromEntries(Object.entries(json).map(([id, v]) => [id, v.usd]));
}
