# Architecture

## Folder Structure

```
app/                    — Routes only. Pages are thin wrappers.
  (auth)/               — Public auth pages
  (dashboard)/          — Protected app pages (layout enforces auth)
  api/                  — API route handlers (one folder per resource)
  layout.tsx
  globals.css

features/[feature]/     — One folder per domain feature (assets, portfolio, transactions, profile…)
  api/                  — Data fetchers, server actions, and Zod schemas for this feature
  components/           — UI components scoped to this feature
  types/                — TypeScript types for this feature

components/
  ui/                   — Generic, reusable components (shadcn/ui + custom)
  layout/               — App shell: header, sidebar, nav

hooks/                  — Shared client-side TanStack Query hooks

lib/                    — Shared infrastructure
  auth/                 — Neon Auth helpers (client + server)
  coingecko/            — CoinGecko API client
  db/                   — Drizzle client, schema, seed
  utils/                — Formatters, calculators, and general helpers
```

## Key Rules

- **Pages are thin.** `app/**/page.tsx` composes feature components — no business logic, no direct DB calls.
- **Data logic belongs in `features/[feature]/api`.** Components never call `fetch` directly.
- **Server Components by default.** Use `"use client"` only for hooks, events, refs, or browser APIs.
- **All DB access through Drizzle.** No raw SQL.
- **Independent queries run in parallel** — use `Promise.all` or parallel `await` at the top of Server Components.
- **Auth scoping.** `userId` from the Neon Auth session scopes every DB query. Never trust client-sent IDs for ownership.

## Data Fetching Patterns

### Server-side (Server Components)

Data fetchers in `features/[feature]/api/get-*.ts` are called directly from Server Components or API routes.

```ts
// features/portfolio/api/get-portfolio.ts
export async function getPortfolio(userId: string): Promise<PortfolioRow[]> { ... }
```

### Client-side (TanStack Query)

Client-side fetching hits the API routes under `/app/api/`. Hooks live in `hooks/` or inside the feature if they're only used there. Crypto prices refetch every 60s automatically.

```ts
// hooks/use-profile.ts
export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
}
```

## Suspense & Skeletons

Granular `Suspense` per section — no full-page spinners. Skeletons live inside the component itself via a discriminated union prop, not in separate files.

```tsx
type Props = { skeleton: true } | { skeleton?: false; data: Data };

export function AssetCard(props: Props) {
  if (props.skeleton) {
    return <div className="h-32 w-full animate-pulse rounded-xl bg-card" />;
  }
  return <div>{props.data.symbol}</div>;
}
```

Usage in `page.tsx`:

```tsx
<Suspense fallback={<AssetCard skeleton />}>
  <AssetCardData />{" "}
  {/* Server Component that fetches and renders <AssetCard data={...} /> */}
</Suspense>
```

If the component needs hooks, extract an inner component:

```tsx
function AssetCardInner({ data }: { data: Data }) {
  const [expanded, setExpanded] = useState(false);
  // ...
}

export function AssetCard(props: Props) {
  if (props.skeleton) return <div className="animate-pulse ..." />;
  return <AssetCardInner data={props.data} />;
}
```

## Naming Conventions

| Element           | Convention | Example                 |
| ----------------- | ---------- | ----------------------- |
| React components  | PascalCase | `AssetCard.tsx`         |
| Hooks             | camelCase  | `usePortfolio`          |
| Functions         | camelCase  | `getTransactionsByUser` |
| TypeScript types  | PascalCase | `Transaction`           |
| API / utils files | kebab-case | `get-transactions.ts`   |
| Folders           | kebab-case | `transaction-form/`     |

## TypeScript

- No `any`. Ever.
- All API contracts explicitly typed.
- Large types stay outside visual components — in `features/[feature]/types/` or `types/`.
- Prefer discriminated unions for variants (including skeleton states).
- Use `import type` for type-only imports.

## Styling

Tailwind CSS v4 with shadcn/ui. Tokens defined in `app/globals.css`.

Always use semantic tokens over raw colors:

| Token                   | Use for                |
| ----------------------- | ---------------------- |
| `bg-background`         | Page background        |
| `bg-card`               | Card / panel surfaces  |
| `text-foreground`       | Primary text           |
| `text-muted-foreground` | Secondary / label text |
| `border-border`         | Dividers and borders   |

Accent colors:

- **Yellow `#F0B90B`** — primary accent (Binance-inspired)
- **Green** — positive P&L / gains
- **Red** — negative P&L / losses

Feature-specific styles go inside the component. Global CSS is only for tokens, base styles, animations, and shared utilities.

## Language Conventions

| Scope            | Language |
| ---------------- | -------- |
| Code & filenames | English  |
| User-visible UI  | Spanish  |
| Code comments    | English  |
