import { getServerSession } from "@/lib/auth/server";
import { Search, Bell } from "lucide-react";
import { HeaderBreadcrumb } from "./HeaderBreadcrumb";
import { RefreshButton } from "./RefreshButton";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

export async function Header() {
  const session = await getServerSession();
  const initials = getInitials(session?.user?.name, session?.user?.email);

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-card px-5">
      <HeaderBreadcrumb />

      <div className="flex items-center gap-2">
        {/* Search — hidden on small screens */}
        <div className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground sm:flex">
          <Search size={13} />
          <span>Buscar activo…</span>
        </div>

        {/* Notifications */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notificaciones"
        >
          <Bell size={14} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        <RefreshButton />

        {/* User avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary">
          {initials}
        </div>
      </div>
    </header>
  );
}
