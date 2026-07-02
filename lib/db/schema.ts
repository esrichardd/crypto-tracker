import {
  pgTable,
  text,
  numeric,
  timestamp,
  date as pgDate,
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
    date: pgDate("date", { mode: "string" }).notNull(),
    notes: text("notes"),
    source: transactionSourceEnum("source").default("manual").notNull(),
    externalId: text("external_id"), // for dedup on Binance/CSV import
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Prevent duplicate imports per user from same source
    uniqueExternalId: unique().on(table.userId, table.source, table.externalId),
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

// --- User Profiles ---

export const genderEnum = pgEnum("gender", [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
]);

export const userProfiles = pgTable("user_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  dateOfBirth: text("date_of_birth"), // ISO date string: 'YYYY-MM-DD'
  gender: genderEnum("gender"),
  country: text("country"), // ISO 3166-1 alpha-2 code: 'MX', 'US', etc.
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Exchange API Keys ---

export const exchangeApiKeys = pgTable(
  "exchange_api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").notNull(),
    exchange: text("exchange").notNull().default("binance"),
    apiKeyEncrypted: text("api_key_encrypted").notNull(),
    apiKeyHint: text("api_key_hint").notNull(), // last 4 chars, shown in UI
    apiSecretEncrypted: text("api_secret_encrypted").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userExchangeUnique: unique().on(table.userId, table.exchange),
  }),
);

// --- Opportunity Settings ---

export const opportunitySettings = pgTable("opportunity_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id").notNull().unique(),
  targetRoiPercent: numeric("target_roi_percent", {
    precision: 8,
    scale: 2,
  })
    .default("20")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Inferred Types ---

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type NewPriceSnapshot = typeof priceSnapshots.$inferInsert;

export type OpportunitySettings = typeof opportunitySettings.$inferSelect;
export type NewOpportunitySettings = typeof opportunitySettings.$inferInsert;
