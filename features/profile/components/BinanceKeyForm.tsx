"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Trash2, KeyRound } from "lucide-react";
import { useSaveBinanceKey, useDeleteBinanceKey } from "@/hooks/use-binance-key";
import type { ExchangeApiKey } from "../types";

type Props =
  | { skeleton: true }
  | { skeleton?: false; existingKey: ExchangeApiKey | null };

export function BinanceKeyForm(props: Props) {
  if (props.skeleton) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="h-10 w-full animate-pulse rounded-lg bg-background" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-background" />
        <div className="h-8 w-32 animate-pulse rounded-lg bg-background" />
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
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
          <KeyRound size={16} className="text-primary shrink-0" />
          <span className="font-mono text-sm text-muted-foreground">
            ••••••••••••{existingKey.apiKeyHint}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            Actualizado{" "}
            {new Date(existingKey.updatedAt).toLocaleDateString("es", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {confirmDelete ? (
          <div className="flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">
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
              Actualizar key
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} className="mr-1.5" />
              Eliminar
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Input form
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="apiKey">API Key</Label>
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="apiSecret">API Secret</Label>
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Solo necesita permisos de lectura. Nunca compartas una key con permisos de retiro.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

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
  );
}
