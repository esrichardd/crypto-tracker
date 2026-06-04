"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_NAV = [
  { href: "/", label: "Portfolio", icon: LayoutDashboard },
  { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
];

const ACCOUNT_NAV = [{ href: "/perfil", label: "Perfil", icon: UserCircle }];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
      )}
      <Icon size={16} />
      {label}
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0 px-2">
      <p className="px-2 pb-2 pt-1 text-[10px] font-medium uppercase tracking-widest text-secondary">
        Principal
      </p>
      {MAIN_NAV.map(({ href, label, icon }) => (
        <NavItem
          key={href}
          href={href}
          label={label}
          icon={icon}
          active={isActive(pathname, href)}
        />
      ))}

      <p className="mt-3 px-2 pb-2 pt-1 text-[10px] font-medium uppercase tracking-widest text-secondary">
        Cuenta
      </p>
      {ACCOUNT_NAV.map(({ href, label, icon }) => (
        <NavItem
          key={href}
          href={href}
          label={label}
          icon={icon}
          active={isActive(pathname, href)}
        />
      ))}
    </nav>
  );
}
