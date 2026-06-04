# Database

Neon Postgres managed via Drizzle ORM. Schema defined in `lib/db/schema.ts`.

## Tables

### `assets`

Catalog of supported cryptocurrencies. Seeded once — not user-generated.

| Column         | Type        | Description                                     |
| -------------- | ----------- | ----------------------------------------------- |
| `id`           | text (PK)   | CUID2 generated ID                              |
| `symbol`       | text        | Ticker symbol, e.g. `BTC`, `ETH`. Unique.       |
| `name`         | text        | Full name, e.g. `Bitcoin`, `Ethereum`           |
| `coingecko_id` | text        | ID used to fetch live prices from CoinGecko API |
| `logo_url`     | text        | URL to the asset's logo image (nullable)        |
| `created_at`   | timestamptz | Row creation time                               |

---

### `transactions`

One row per buy or sell operation logged by a user.

| Column        | Type        | Description                                                                                 |
| ------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `id`          | text (PK)   | CUID2 generated ID                                                                          |
| `user_id`     | text        | Owner of the transaction. Comes from the Neon Auth session — never trusted from the client. |
| `asset_id`    | text (FK)   | References `assets.id`                                                                      |
| `type`        | enum        | `buy` or `sell`                                                                             |
| `price_usd`   | numeric     | Price per unit in USD at the time of the transaction (precision: 20, scale: 8)              |
| `quantity`    | numeric     | Number of units bought or sold (precision: 20, scale: 8)                                    |
| `fee`         | numeric     | Trading fee in USD. Defaults to `0` (precision: 20, scale: 8)                               |
| `date`        | timestamptz | When the transaction occurred (user-provided, not necessarily `created_at`)                 |
| `notes`       | text        | Optional free-text note from the user (nullable)                                            |
| `source`      | enum        | How the transaction was created: `manual`, `binance`, or `csv`                              |
| `external_id` | text        | External reference ID used for deduplication on Binance/CSV imports (nullable)              |
| `created_at`  | timestamptz | Row creation time                                                                           |

**Indexes:** `user_id`, `asset_id`, `date` — optimized for per-user queries and date-range filters.

**Unique constraint:** `(source, external_id)` — prevents duplicate imports from the same external source.

---

### `price_snapshots`

Historical price records per asset, intended for portfolio value charts over time. One snapshot per asset per day (enforced at the application level).

| Column        | Type        | Description                                                       |
| ------------- | ----------- | ----------------------------------------------------------------- |
| `id`          | text (PK)   | CUID2 generated ID                                                |
| `asset_id`    | text (FK)   | References `assets.id`                                            |
| `price_usd`   | numeric     | Asset price in USD at the recorded time (precision: 20, scale: 8) |
| `recorded_at` | timestamptz | When the price was captured                                       |

**Index:** `(asset_id, recorded_at)` — optimized for time-series queries per asset.

---

### `user_profiles`

Optional profile information for each user. Created lazily (on first profile save).

| Column          | Type        | Description                                                   |
| --------------- | ----------- | ------------------------------------------------------------- |
| `id`            | text (PK)   | CUID2 generated ID                                            |
| `user_id`       | text        | References the Neon Auth user. One profile per user (unique). |
| `first_name`    | text        | (nullable)                                                    |
| `last_name`     | text        | (nullable)                                                    |
| `date_of_birth` | text        | ISO date string `YYYY-MM-DD` (nullable)                       |
| `gender`        | enum        | `male`, `female`, `other`, `prefer_not_to_say` (nullable)     |
| `country`       | text        | ISO 3166-1 alpha-2 country code, e.g. `MX`, `US` (nullable)   |
| `created_at`    | timestamptz | Row creation time                                             |
| `updated_at`    | timestamptz | Last update time                                              |

---

### `exchange_api_keys`

Stores encrypted API credentials for connected exchanges (currently only Binance). Used to import transactions automatically.

| Column                 | Type        | Description                                                          |
| ---------------------- | ----------- | -------------------------------------------------------------------- |
| `id`                   | text (PK)   | CUID2 generated ID                                                   |
| `user_id`              | text        | Owner of the key                                                     |
| `exchange`             | text        | Exchange name. Defaults to `binance`                                 |
| `api_key_encrypted`    | text        | API key encrypted with AES-256-GCM (`lib/crypto.ts`)                 |
| `api_key_hint`         | text        | Last 4 characters of the API key, shown in the UI for identification |
| `api_secret_encrypted` | text        | API secret encrypted with AES-256-GCM                                |
| `created_at`           | timestamptz | Row creation time                                                    |
| `updated_at`           | timestamptz | Last update time                                                     |

**Unique constraint:** `(user_id, exchange)` — one key pair per exchange per user.

> Keys are encrypted at rest using AES-256-GCM with the `ENCRYPTION_KEY` env variable. The raw key and secret are never stored.

## Enums

| Enum                 | Values                                         |
| -------------------- | ---------------------------------------------- |
| `transaction_type`   | `buy`, `sell`                                  |
| `transaction_source` | `manual`, `binance`, `csv`                     |
| `gender`             | `male`, `female`, `other`, `prefer_not_to_say` |
