import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import type { Asset } from "@/lib/db/schema";

export async function getAssets(): Promise<Asset[]> {
  return db.select().from(assets).orderBy(assets.symbol);
}
