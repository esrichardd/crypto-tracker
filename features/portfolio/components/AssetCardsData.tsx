import { requireSession } from "@/lib/auth/server";
import { getPortfolio } from "../api/get-portfolio";
import { AssetCard } from "./AssetCard";

export async function AssetCardsData() {
  const session = await requireSession();
  const portfolio = await getPortfolio(session.user.id);

  if (portfolio.holdings.length === 0) {
    return (
      <p className="col-span-full text-sm text-muted-foreground">
        No tienes activos registrados.{" "}
        <a href="/transactions/new" className="text-primary underline">
          Registra tu primera compra
        </a>
      </p>
    );
  }

  return (
    <>
      {portfolio.holdings.map((holding) => (
        <AssetCard key={holding.asset.id} data={holding} />
      ))}
    </>
  );
}
