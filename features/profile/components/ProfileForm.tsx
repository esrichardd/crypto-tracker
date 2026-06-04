"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, User } from "lucide-react";
import { useUpsertProfile } from "@/hooks/use-profile";
import { COUNTRIES } from "@/lib/countries";
import type { UserProfile } from "../types";

type Props = { skeleton: true } | { skeleton?: false; profile: UserProfile | null };

export function ProfileForm(props: Props) {
  if (props.skeleton) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="h-4 w-40 animate-pulse rounded bg-background" />
        </div>
        <div className="flex flex-col gap-4 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-background" />
          ))}
          <div className="h-9 w-32 animate-pulse rounded-lg bg-background" />
        </div>
      </div>
    );
  }

  return <ProfileFormInner profile={props.profile} />;
}

function ProfileFormInner({ profile }: { profile: UserProfile | null }) {
  const { mutate, isPending } = useUpsertProfile();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    dateOfBirth: profile?.dateOfBirth ?? "",
    gender: profile?.gender ?? "",
    country: profile?.country ?? "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    mutate(
      {
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth,
        gender: (form.gender as UserProfile["gender"]) || null,
        country: form.country,
      },
      {
        onSuccess: () => setSuccess(true),
        onError: () => setError("Error al guardar. Intenta de nuevo."),
      },
    );
  }

  const selectClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Section header */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <User size={15} className="text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">Información personal</p>
          <p className="text-xs text-muted-foreground">Información básica de tu cuenta</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        {/* Name row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName" className="text-xs uppercase tracking-wide text-muted-foreground">
              Nombre
            </Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName" className="text-xs uppercase tracking-wide text-muted-foreground">
              Apellido
            </Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              required
            />
          </div>
        </div>

        {/* DOB + Gender row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dateOfBirth" className="text-xs uppercase tracking-wide text-muted-foreground">
              Fecha de nacimiento
            </Label>
            <input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              required
              className={selectClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gender" className="text-xs uppercase tracking-wide text-muted-foreground">
              Género
            </Label>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
              className={selectClass}
            >
              <option value="">Seleccionar</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="other">Otro</option>
              <option value="prefer_not_to_say">Prefiero no decir</option>
            </select>
          </div>
        </div>

        {/* Country */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country" className="text-xs uppercase tracking-wide text-muted-foreground">
            País de residencia
          </Label>
          <select
            id="country"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            required
            className={selectClass}
          >
            <option value="">Seleccionar país</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Feedback */}
        {error && <p className="text-sm text-danger">{error}</p>}
        {success && (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <Check size={14} />
            Perfil guardado correctamente.
          </p>
        )}

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}
