# Crypto Tracker — Project Instructions

## Language

- Code: English.
- Variables, functions, types, and files: English.
- User-visible UI: neutral Spanish.
- Code comments: English.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript strict
- Tailwind CSS v4
- Neon Postgres + Neon Auth (Better Auth under the hood)
- Drizzle ORM
- Shadcn/ui
- TanStack Query v5
- Zod (validation)
- `lucide-react` for icons
- CoinGecko API (free tier) for live crypto prices

## Architecture

Feature-based architecture. Each feature owns its data logic, components, and types.

```
app/                  — Routes only. Pages are thin — they compose feature components.
  (auth)/             — Auth pages (sign-in, sign-up)
  (dashboard)/        — Protected app pages
  api/                — API route handlers
  globals.css
  layout.tsx

features/[feature]/   — One folder per domain feature
  api/                — Data fetchers and server-side logic
  components/         — UI components scoped to this feature
  types/              — TypeScript types for this feature

components/ui/        — Generic, reusable components (shadcn + custom)

lib/                  — Shared infrastructure: DB client, external API clients, utils, auth helpers

hooks/                — Shared client-side hooks (TanStack Query)

types/                — Global shared types
```

Rules:

- `app/[route]/page.tsx` must be thin — compose sections, no heavy logic.
- Data logic for a feature lives in `features/[feature]/api`.
- Types for a feature live in `features/[feature]/types`.
- Generic components live in `components/ui`.
- Never mix fetch, data transformation, and visual UI in the same component.
- All DB queries go through Drizzle — never raw SQL.
- Server Components for data fetching. Use `"use client"` only when needed (hooks, events, refs, browser APIs).
- API routes in `/app/api/`.

## Naming

| Element          | Convention | Example                 |
| ---------------- | ---------- | ----------------------- |
| React components | PascalCase | `AssetCard.tsx`         |
| Hooks            | camelCase  | `usePortfolio`          |
| Functions        | camelCase  | `getTransactionsByUser` |
| TypeScript types | PascalCase | `Transaction`           |
| API/utils files  | kebab-case | `get-transactions.ts`   |
| Folders          | kebab-case | `transaction-form`      |

## Suspense & Skeletons

Use granular `Suspense` per section. Do NOT create separate skeleton files.

Every component that needs a loading state must use a skeleton variant with discriminated union:

```tsx
type Props = { skeleton: true } | { skeleton?: false; data: Data };

export function Component(props: Props) {
  if (props.skeleton) {
    return <div className="h-32 w-full animate-pulse rounded-xl bg-card" />;
  }
  return <div>{props.data.name}</div>;
}
```

In `page.tsx`:

```tsx
<Suspense fallback={<Component skeleton />}>
  <ComponentData />
</Suspense>
```

If the component uses hooks, extract logic to an inner component:

```tsx
function ComponentInner({ data }: { data: Data }) {
  const [open, setOpen] = useState(false);
  return <div>{data.name}</div>;
}

export function Component(props: Props) {
  if (props.skeleton) return <div className="animate-pulse ..." />;
  return <ComponentInner data={props.data} />;
}
```

## TypeScript

- No `any`.
- Explicitly type all API contracts.
- Keep large types outside visual components.
- Prefer discriminated unions for variants.
- Use type-only imports with `import type`.

## Design

UI must feel like a premium crypto dashboard (Binance-inspired).

Principles:

- Dark mode as base.
- Compact, dense, readable layout.
- Clear hierarchy for important data.
- Primary accent: Binance yellow `#F0B90B`.
- Green for positive P&L / gains.
- Red for negative P&L / losses.
- Muted gray for neutral states.
- Compact tables with right-aligned numbers.
- Crypto logos/icons where applicable.

Avoid:

- Generic SaaS aesthetics.
- Too much whitespace.
- Large cards with little content.
- Unnecessary hero/marketing sections.
- Visible text explaining how to use the interface.
- Decoration without function.

## Tailwind & CSS

- Global tokens in `app/globals.css`.
- Prefer tokens over hardcoded colors.
- Use semantic classes:
  - `bg-background`
  - `bg-card`
  - `text-foreground`
  - `text-muted-foreground`
  - `border-border`
- Global CSS only for tokens, base styles, animations, and shared utilities.
- Avoid feature-specific global CSS.

## Data Fetching

- Fetchers live in `features/[feature]/api`.
- Visual components must not call `fetch` directly.
- Independent queries must resolve in parallel when applicable.
- Crypto prices fetched client-side via TanStack Query, refetch every 60s.
- Auth handled by Neon Auth — `userId` from session scopes all holdings queries.

## Dependencies

- Use `lucide-react` for icons.
- Do not add heavy UI libraries without justification.
- If adding a dependency, update `package.json`.

## Environment Variables

```
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
```

## Commands

- `pnpm dev` — local dev
- `pnpm drizzle-kit push` — apply schema changes to Neon
- `pnpm drizzle-kit studio` — visual DB editor

## Before Closing

- No dead imports.
- Verify user-visible text is in Spanish.
- Verify code, types, and filenames are in English.
- Keep skeletons as component variants — no separate files.
- Do not introduce unnecessary dependencies.
- Report if lint/build could not be run.
