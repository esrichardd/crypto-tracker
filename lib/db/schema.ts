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
