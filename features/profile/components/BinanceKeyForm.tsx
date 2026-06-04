"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Trash2, KeyRound, ShieldCheck, RefreshCw } from "lucide-react";
import { useSaveBinanceKey, useDeleteBinanceKey } from "@/hooks/use-binance-key";
import type { ExchangeApiKey } from "../types";

type Props =
  | { skeleton: true }
  | { skeleton?: false; existingKey: ExchangeApiKey | null };

export function BinanceKeyForm(props: Props) {
  if (props.skeleton) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="h-4 w-40 animate-pulse rounded bg-background" />
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className="h-12 w-full animate-pulse rounded-lg bg-background" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-background" />
          <div className="h-9 w-36 animate-pulse rounded-lg bg-background" />
        </div>
      </div>
    );
  }

  return <BinanceKeyFormInner existingKey={props.existingKey} />;
}

function BinanceKeyFormInner({ existingKey }: { existingKey: ExchangeApiKey | null }) {
  const [editing, setEditing] = useState(!existingKey);
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ apiKey: "", apiSecret: "" });

  const { mutate: save, isPending: saving } = useSaveBinanceKey();
  const { mutate: remove, isPending: removing } = useDeleteBinanceKey();

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.apiKey.length < 10 || form.apiSecret.length < 10) {
      setError("API Key y API Secret deben tener al menos 10 caracteres.");
      return;
    }

    save(
      { apiKey: form.apiKey, apiSecret: form.apiSecret },
      {
        onSuccess: () => {
          setForm({ apiKey: "", apiSecret: "" });
          setEditing(false);
        },
        onError: () => setError("Error al guardar. Intenta de nuevo."),
      },
    );
  }

  function handleDelete() {
    remove(undefined, {
      onSuccess: () => {
        setConfirmDelete(false);
        setEditing(true);
      },
      onError: () => setError("Error al eliminar."),
    });
  }

  // Saved key view
  if (!editing && existingKey) {
    return (
      <div className="rounded-xl border border-border bg-card">
        {/* Section header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <KeyRound size={15} className="text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Binance API Key</p>
              <p className="text-xs text-muted-foreground">
                Sincroniza transacciones automáticamente
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Activa
          </span>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Key hint row */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
            <KeyRound size={14} className="shrink-0 text-primary" />
            <span className="flex-1 font-mono text-sm text-muted-foreground">
              ••••••••••••{existingKey.apiKeyHint}
            </span>
            <span className="text-xs text-muted-foreground">
              Actualizado{" "}
              {new Date(existingKey.updatedAt).toLocaleDateString("es", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Solo permisos de lectura. Nunca compartas una key con permisos de retiro.
            </p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {/* Confirm delete panel */}
          {confirmDelete ? (
            <div className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4">
              <p className="text-sm text-danger">
                ¿Eliminar la API Key de Binance? Los features que dependan de ella
                dejarán de funcionar.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={removing}
                >
                  {removing ? "Eliminando..." : "Sí, eliminar"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <RefreshCw size={13} className="mr-1.5" />
                Actualizar key
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={13} className="mr-1.5" />
                Eliminar
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Input form
  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Section header */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <KeyRound size={15} className="text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">Binance API Key</p>
          <p className="text-xs text-muted-foreground">
            Sincroniza transacciones automáticamente
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apiKey" className="text-xs uppercase tracking-wide text-muted-foreground">
            API Key
          </Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showKey ? "text" : "password"}
              placeholder="Pega tu API Key de Binance"
              value={form.apiKey}
              onChange={(e) => set("apiKey", e.target.value)}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showKey ? "Ocultar API Key" : "Mostrar API Key"}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apiSecret" className="text-xs uppercase tracking-wide text-muted-foreground">
            API Secret
          </Label>
          <div className="relative">
            <Input
              id="apiSecret"
              type={showSecret ? "text" : "password"}
              placeholder="Pega tu API Secret de Binance"
              value={form.apiSecret}
              onChange={(e) => set("apiSecret", e.target.value)}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showSecret ? "Ocultar API Secret" : "Mostrar API Secret"}
            >
              {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Solo necesita permisos de lectura. Nunca compartas una key con permisos de retiro.
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar API Key"}
          </Button>
          {existingKey && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setForm({ apiKey: "", apiSecret: "" });
                setError("");
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
