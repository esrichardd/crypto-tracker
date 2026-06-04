import { getServerSession } from "@/lib/auth/server";
import { Bitcoin } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { SignOutButton } from "./SignOutButton";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

export async function Sidebar() {
  const session = await getServerSession();
  const initials = getInitials(session?.user?.name, session?.user?.email);
  const displayName = session?.user?.name ?? session?.user?.email ?? "Usuario";

  return (
    <aside className="hidden w-56 flex-col border-r border-border bg-card md:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-[18px]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
          <Bitcoin size={15} className="text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">CryptoTracker</p>
          <p className="text-[10px] text-secondary">Portfolio Pro</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav />
      </div>

      {/* User panel */}
      <div className="border-t border-border p-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {displayName}
            </p>
            <p className="text-[10px] text-secondary">Plan gratuito</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
