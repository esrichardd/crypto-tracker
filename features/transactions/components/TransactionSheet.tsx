"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionForm } from "./TransactionForm";
import type { Asset } from "@/lib/db/schema";

type Props = {
  assets: Asset[];
};

export function TransactionSheet({ assets }: Props) {
  const [open, setOpen] = useState(false);
  // Track mounted to enable CSS transition (not on first render)
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  function openSheet() {
    setMounted(true);
    // tiny delay so the initial class is applied before transitioning
    requestAnimationFrame(() => setOpen(true));
  }

  function closeSheet() {
    setOpen(false);
  }

  // Re-enable scroll & handle Escape
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSheet();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Unmount panel after close transition finishes
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <>
      {/* ── Trigger button ─────────────────────────────── */}
      <button
        onClick={openSheet}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Plus size={14} aria-hidden />
        <span className="hidden sm:inline">Nueva transacción</span>
        <span className="sm:hidden">Nueva</span>
      </button>

      {/* ── Portal-like overlay + sheet ────────────────── */}
      {mounted && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className={cn(
              "absolute inset-0 bg-black/60 transition-opacity duration-300",
              open ? "opacity-100" : "opacity-0",
            )}
            onClick={closeSheet}
            aria-hidden
          />

          {/* Sheet panel */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Nueva transacción"
            className={cn(
              "relative flex h-full w-full flex-col bg-card transition-transform duration-300 md:max-w-[460px]",
              "border-l border-border",
              open ? "translate-x-0" : "translate-x-full",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                Nueva transacción
              </h2>
              <button
                onClick={closeSheet}
                aria-label="Cerrar"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <TransactionForm
                assets={assets}
                onSuccess={closeSheet}
                onCancel={closeSheet}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
