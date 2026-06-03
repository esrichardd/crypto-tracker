import { db } from "./index";
import { assets } from "./schema";

async function seed() {
  console.log("Seeding assets...");

  await db
    .insert(assets)
    .values([
      {
        symbol: "BTC",
        name: "Bitcoin",
        coingeckoId: "bitcoin",
        logoUrl:
          "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        coingeckoId: "ethereum",
        logoUrl:
          "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
      },
      {
        symbol: "SOL",
        name: "Solana",
        coingeckoId: "solana",
        logoUrl:
          "https://assets.coingecko.com/coins/images/4128/large/solana.png",
      },
    ])
    .onConflictDoNothing(); // idempotent — safe to run multiple times

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
