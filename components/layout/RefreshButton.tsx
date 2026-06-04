"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isPending}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      aria-label="Actualizar precios"
    >
      <RefreshCw
        size={14}
        className={cn(isPending && "animate-spin")}
      />
    </button>
  );
}
