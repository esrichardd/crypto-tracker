"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Portfolio", icon: LayoutDashboard },
  { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/perfil", label: "Perfil", icon: UserCircle },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-14 shrink-0 items-center justify-around border-t border-border bg-card md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-4 py-2"
          >
            <Icon
              size={20}
              className={cn(
                active ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "text-[10px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
