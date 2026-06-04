import type { ReactNode } from "react";

const TICKERS = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    color: "#F7931A",
    price: "$67,420",
    pct: "+2.34%",
    up: true,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    color: "#627EEA",
    price: "$3,512",
    pct: "-0.87%",
    up: false,
  },
  {
    symbol: "BNB",
    name: "BNB Chain",
    color: "#F0B90B",
    price: "$412",
    pct: "+1.12%",
    up: true,
  },
];

type Props = {
  children: ReactNode;
  badge?: string;
  headline: ReactNode;
  subheadline: string;
};

export function AuthLayout({ children, badge, headline, subheadline }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-xl border border-border">
        {/* Left panel — branding */}
        <aside className="hidden w-[42%] flex-col justify-between bg-background p-10 lg:flex border-r border-border">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <HexIcon />
            </div>
            <span className="text-sm font-medium text-foreground tracking-tight">
              CryptoTracker
            </span>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-4">
            {badge && (
              <div className="flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="text-[11px] font-medium uppercase tracking-widest text-primary">
                  {badge}
                </span>
              </div>
            )}
            <h1 className="text-2xl font-medium leading-snug text-foreground">
              {headline}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {subheadline}
            </p>
          </div>

          {/* Live tickers */}
          <div className="flex flex-col gap-2">
            {TICKERS.map((t) => (
              <div
                key={t.symbol}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: t.color }}
                  />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {t.symbol}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-foreground">
                    {t.price}
                  </p>
                  <p
                    className={
                      "text-[11px] font-medium " +
                      (t.up ? "text-success" : "text-danger")
                    }
                  >
                    {t.pct}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right panel — form */}
        <div className="flex flex-1 flex-col bg-card">
          {/* Mobile branding header — hidden on desktop */}
          <div className="flex flex-col items-center gap-3 border-b border-border bg-background px-6 py-5 lg:hidden">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <HexIcon />
              </div>
              <span className="text-sm font-medium tracking-tight text-foreground">
                CryptoTracker
              </span>
            </div>
            <p className="text-center text-sm font-medium leading-snug text-foreground">
              {headline}
            </p>
          </div>

          {/* Form content */}
          <div className="flex flex-1 flex-col justify-center p-8 sm:p-10">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

function HexIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="M8 2L11 5H9.5V7.5H6.5V5H5L8 2Z" fill="#0b0e11" />
      <path d="M8 14L5 11H6.5V8.5H9.5V11H11L8 14Z" fill="#0b0e11" />
      <path d="M3 8L5 6V7.5H7.5V8.5H5V10L3 8Z" fill="#0b0e11" />
      <path d="M13 8L11 10V8.5H8.5V7.5H11V6L13 8Z" fill="#0b0e11" />
    </svg>
  );
}
