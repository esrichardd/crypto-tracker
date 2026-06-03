# Plan 01 — Database Schema

## Objective

Define and apply the full Drizzle schema to Neon Postgres. Seed initial asset catalog (BTC, ETH, SOL). Set up the Drizzle client and config.

## Dependencies

- `DATABASE_URL` must be set in `.env.local`.
- Neon project must exist (create at neon.tech if not).

---

## 1. Install Dependencies

```bash
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

---

## 2. Drizzle Config

**File:** `drizzle.config.ts` (project root)

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

## 3. Drizzle Client

**File:** `lib/db/index.ts`

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

---

## 4. Schema

**File:** `lib/db/schema.ts`

### Design decisions

- `assets` is a catalog table — seeded, not user-created. Extensible to any CoinGecko asset.
- `transactions.source` supports `manual | binance | csv` for future sync integrations.
- `transactions.external_id` is a nullable unique key per source — prevents duplicate imports.
- `price_snapshots` stores daily prices per asset for portfolio-over-time charts.
- All monetary values stored as `numeric(20, 8)` to avoid floating-point errors.
- Timestamps use `timestamp('...', { withTimezone: true })`.

```ts
import {
  pgTable,
  text,
  numeric,
  timestamp,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// --- Enums ---

export const transactionTypeEnum = pgEnum("transaction_type", ["buy", "sell"]);
export const transactionSourceEnum = pgEnum("transaction_source", [
  "manual",
  "binance",
  "csv",
]);

// --- Assets (crypto catalog) ---

export const assets = pgTable("assets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  symbol: text("symbol").notNull().unique(), // 'BTC', 'ETH', 'SOL'
  name: text("name").notNull(), // 'Bitcoin', 'Ethereum', 'Solana'
  coingeckoId: text("coingecko_id").notNull(), // 'bitcoin', 'ethereum', 'solana'
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Transactions ---

export const transactions = pgTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").notNull(), // from Neon Auth session
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    type: transactionTypeEnum("type").notNull(), // 'buy' | 'sell'
    priceUsd: numeric("price_usd", { precision: 20, scale: 8 }).notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
    fee: numeric("fee", { precision: 20, scale: 8 }).default("0").notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    notes: text("notes"),
    source: transactionSourceEnum("source").default("manual").notNull(),
    externalId: text("external_id"), // for dedup on Binance/CSV import
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Prevent duplicate imports from same source
    uniqueExternalId: unique().on(table.source, table.externalId),
    // Fast queries by user
    userIdIdx: index("transactions_user_id_idx").on(table.userId),
    // Fast queries by asset
    assetIdIdx: index("transactions_asset_id_idx").on(table.assetId),
    // Fast date-range queries
    dateIdx: index("transactions_date_idx").on(table.date),
  }),
);

// --- Price Snapshots (for portfolio history charts) ---

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    priceUsd: numeric("price_usd", { precision: 20, scale: 8 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    // One snapshot per asset per day — enforce at app level, index for queries
    assetDateIdx: index("price_snapshots_asset_date_idx").on(
      table.assetId,
      table.recordedAt,
    ),
  }),
);

// --- Inferred Types ---

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type NewPriceSnapshot = typeof priceSnapshots.$inferInsert;
```

---

## 5. Install cuid2

```bash
pnpm add @paralleldrive/cuid2
```

---

## 6. Seed File

**File:** `lib/db/seed.ts`

Run once to insert BTC, ETH, SOL into the `assets` table.

```ts
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
```

Add to `package.json` scripts:

```json
"scripts": {
  "db:seed": "tsx lib/db/seed.ts"
}
```

Install `tsx` if not present:

```bash
pnpm add -D tsx
```

---

## 7. Apply Schema to Neon

```bash
# Push schema (creates tables in Neon)
pnpm drizzle-kit push

# Verify in Drizzle Studio
pnpm drizzle-kit studio

# Seed initial assets
pnpm db:seed
```

---

## 8. Verification Checklist

- [ ] `pnpm drizzle-kit push` runs without errors.
- [ ] Drizzle Studio shows tables: `assets`, `transactions`, `price_snapshots`.
- [ ] `pnpm db:seed` inserts 3 rows in `assets` (BTC, ETH, SOL).
- [ ] Running seed a second time does not throw — `onConflictDoNothing` works.
- [ ] `transactions` table has indexes on `user_id`, `asset_id`, `date`.
- [ ] `transactions` has a unique constraint on `(source, external_id)`.

---

## Notes for Future Binance Integration

When implementing Binance sync:

1. Set `source = 'binance'` on imported transactions.
2. Store Binance trade ID in `external_id`.
3. The unique constraint `(source, external_id)` prevents duplicates automatically on `INSERT ... ON CONFLICT DO NOTHING`.
