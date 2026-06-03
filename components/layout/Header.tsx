import { getServerSession } from "@/lib/auth/server";
import { SignOutButton } from "./SignOutButton";

export async function Header() {
  const session = await getServerSession();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div />
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{session?.user?.email}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
