# Plan 04 — UI Theme & Globals

## Objective

Define Binance-inspired dark theme tokens in `globals.css`, set up shadcn/ui, configure the root layout, and install shared utilities. Tailwind v4 comes pre-configured with Next.js 16 — no extra setup needed.

## Dependencies

- Next.js project initialized.
- Plan 01 (DB) not required — this is purely frontend setup.

---

## 1. Install shadcn/ui

```bash
pnpm dlx shadcn@latest init
```

When prompted:

- Style: **Default**
- Base color: **Neutral** (we override everything in globals.css)
- CSS variables: **Yes**

Then install components used across the project:

```bash
pnpm dlx shadcn@latest add button input label
```

Add more as needed per plan (e.g. `select`, `dialog`, `toast`).

---

## 3. globals.css — Binance Dark Theme

**File:** `app/globals.css`

This is the single source of truth for all design tokens.

```css
@import "tailwindcss";

/* ============================================================
   CRYPTO TRACKER — BINANCE-INSPIRED DARK THEME
   ============================================================ */

@layer base {
  :root {
    /* Background */
    --background: #0b0e11; /* Binance near-black */
    --card: #161a1e; /* Slightly lighter card surface */
    --card-hover: #1e2329; /* Hover state for cards */
    --popover: #1e2329;

    /* Text */
    --foreground: #eaecef; /* Primary text — Binance light gray */
    --muted-foreground: #848e9c; /* Secondary text */
    --secondary: #5e6673; /* Tertiary / disabled */

    /* Borders */
    --border: #2b3139; /* Subtle border */
    --border-strong: #474d57; /* Stronger border for focus states */

    /* Brand accent */
    --primary: #f0b90b; /* Binance yellow */
    --primary-foreground: #0b0e11;

    /* Status colors */
    --success: #0ecb81; /* Binance green — gains */
    --danger: #f6465d; /* Binance red — losses */
    --warning: #f0b90b;

    /* Input */
    --input: #2b3139;
    --ring: #f0b90b;

    /* Radius */
    --radius: 0.5rem;
  }
}

/* ============================================================
   TAILWIND v4 TOKEN MAPPING
   ============================================================ */

@theme {
  --color-background: var(--background);
  --color-card: var(--card);
  --color-card-hover: var(--card-hover);
  --color-popover: var(--popover);

  --color-foreground: var(--foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-secondary: var(--secondary);

  --color-border: var(--border);
  --color-border-strong: var(--border-strong);

  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);

  --color-success: var(--success);
  --color-danger: var(--danger);
  --color-warning: var(--warning);

  --color-input: var(--input);
  --color-ring: var(--ring);

  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 4px);
  --radius-xl: calc(var(--radius) + 8px);
}

/* ============================================================
   BASE STYLES
   ============================================================ */

@layer base {
  * {
    border-color: var(--border);
    box-sizing: border-box;
  }

  html {
    color-scheme: dark;
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans), system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* Remove number input spinners — cleaner for financial inputs */
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }

  /* Date input styling for dark bg */
  input[type="date"],
  input[type="datetime-local"] {
    color-scheme: dark;
  }
}

/* ============================================================
   UTILITY CLASSES
   ============================================================ */

@layer utilities {
  /* Monospace numbers — always use for financial data */
  .font-numeric {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
  }

  /* P&L colors */
  .text-gain {
    color: var(--success);
  }

  .text-loss {
    color: var(--danger);
  }

  .text-neutral-pnl {
    color: var(--muted-foreground);
  }

  /* Subtle scrollbar */
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
}

/* ============================================================
   COMPONENT OVERRIDES (shadcn tokens)
   ============================================================ */

/* Map shadcn CSS variable names to our tokens */
:root {
  --shadcn-background: var(--background);
  --shadcn-foreground: var(--foreground);
  --shadcn-card: var(--card);
  --shadcn-card-foreground: var(--foreground);
  --shadcn-border: var(--border);
  --shadcn-input: var(--input);
  --shadcn-primary: var(--primary);
  --shadcn-primary-foreground: var(--primary-foreground);
  --shadcn-muted: var(--card);
  --shadcn-muted-foreground: var(--muted-foreground);
  --shadcn-ring: var(--ring);
  --shadcn-radius: var(--radius);
}
```

---

## 4. Root Layout

**File:** `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CryptoTracker",
  description: "Seguimiento de tu portfolio de criptomonedas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

> **Note:** If `next/font/google` fails due to network issues, replace with system font:
>
> ```ts
> // No import needed — just remove the Inter setup and set:
> // font-family: system-ui, -apple-system, sans-serif in globals.css
> ```

---

## 5. TanStack Query Provider

Wrap the dashboard layout (not root) so server pages don't get client overhead.

**File:** `app/(dashboard)/providers.tsx`

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 60s — matches CoinGecko cache
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

**File:** `app/(dashboard)/layout.tsx` — wrap with Providers:

```tsx
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
```

Install TanStack Query:

```bash
pnpm add @tanstack/react-query
```

---

## 6. shadcn Component Overrides

shadcn genera el botón usando `--primary` del CSS — con nuestros tokens debería quedar amarillo automáticamente. Verificar que `components/ui/button.tsx` tenga en la variante default:

```ts
default: 'bg-primary text-primary-foreground hover:bg-primary/90',
```

Si no, editarlo manualmente.

---

## 7. `lib/utils.ts`

shadcn genera este archivo automáticamente durante `init`. Verificar que exista con este contenido:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

> `clsx` y `tailwind-merge` los instala shadcn — no instalar manualmente.

---

## 8. Formatters Utility

**File:** `lib/utils/formatters.ts`

```ts
export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCrypto(value: number, decimals = 8): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
```

---

## 9. P&L Utils

**File:** `lib/utils/pnl.ts`

```ts
export function calcAvgBuyPrice(
  buys: { price: number; quantity: number }[],
): number {
  const totalCost = buys.reduce((sum, b) => sum + b.price * b.quantity, 0);
  const totalQty = buys.reduce((sum, b) => sum + b.quantity, 0);
  return totalQty === 0 ? 0 : totalCost / totalQty;
}

export function calcUnrealizedPnl(
  avgBuyPrice: number,
  currentPrice: number,
  quantity: number,
): { absolute: number; percent: number } {
  const costBasis = avgBuyPrice * quantity;
  const currentValue = currentPrice * quantity;
  const absolute = currentValue - costBasis;
  const percent = costBasis === 0 ? 0 : (absolute / costBasis) * 100;
  return { absolute, percent };
}
```

---

## 10. Verification Checklist

- [ ] `pnpm dev` starts without Tailwind errors.
- [ ] Background is near-black (`#0b0e11`), not white.
- [ ] Primary color (buttons, links) is Binance yellow.
- [ ] `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border` classes apply correct values.
- [ ] shadcn `Button` renders with yellow background.
- [ ] shadcn `Input` renders with dark background.
- [ ] `formatUSD(65000)` returns `"$65,000.00"`.
- [ ] `formatPercent(5.4)` returns `"+5.40%"`.
- [ ] `formatPercent(-2.1)` returns `"-2.10%"`.
- [ ] TanStack Query Provider wraps dashboard without SSR errors.
- [ ] No `any` or TypeScript errors in utils files.
