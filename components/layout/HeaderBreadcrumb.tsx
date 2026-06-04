"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, UserCircle } from "lucide-react";
import type { ComponentType } from "react";

type RouteConfig = {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const ROUTES: Record<string, RouteConfig> = {
  "/": { label: "Portfolio", icon: LayoutDashboard },
  "/transactions": { label: "Transacciones", icon: ArrowLeftRight },
  "/transactions/new": { label: "Nueva transacción", icon: ArrowLeftRight },
  "/transactions/import": { label: "Importar transacciones", icon: ArrowLeftRight },
  "/perfil": { label: "Perfil", icon: UserCircle },
};

export function HeaderBreadcrumb() {
  const pathname = usePathname();
  const route = ROUTES[pathname] ?? ROUTES["/"];
  const Icon = route.icon;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={15} className="text-muted-foreground" />
      <span className="font-medium text-foreground">{route.label}</span>
    </div>
  );
}
