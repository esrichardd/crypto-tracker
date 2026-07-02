export function OpportunitiesSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-background" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-background" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-background" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="h-9 animate-pulse rounded-lg bg-background" />
          <div className="h-9 animate-pulse rounded-lg bg-background" />
          <div className="h-9 animate-pulse rounded-lg bg-background" />
          <div className="h-9 animate-pulse rounded-lg bg-background" />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <div className="h-4 w-44 animate-pulse rounded bg-background" />
        </div>
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="p-4">
              <div className="h-5 w-full animate-pulse rounded bg-background" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
