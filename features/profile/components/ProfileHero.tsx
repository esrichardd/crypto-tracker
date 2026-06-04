import type { UserProfile } from "../types";
import type { ExchangeApiKey } from "../types";

type Props = {
  skeleton?: false;
  profile: UserProfile | null;
  binanceKey: ExchangeApiKey | null;
  userEmail: string | null;
};

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string {
  if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

export function ProfileHero({ profile, binanceKey, userEmail }: Props) {
  const initials = getInitials(profile?.firstName, profile?.lastName, userEmail);
  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile?.firstName ?? userEmail ?? "Usuario";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      {/* Yellow top accent line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-primary" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-medium text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
          {initials}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-base font-medium text-foreground">{displayName}</p>
          {userEmail && (
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            {binanceKey ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Binance conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                Binance no conectado
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileHeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-primary" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-14 w-14 animate-pulse rounded-full bg-background" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-36 animate-pulse rounded bg-background" />
          <div className="h-3 w-48 animate-pulse rounded bg-background" />
          <div className="h-5 w-28 animate-pulse rounded-full bg-background" />
        </div>
      </div>
    </div>
  );
}
