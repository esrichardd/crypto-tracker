"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpsertProfile } from "@/hooks/use-profile";
import { COUNTRIES } from "@/lib/countries";
import type { UserProfile } from "../types";

type Props = { skeleton: true } | { skeleton?: false; profile: UserProfile | null };

export function ProfileForm(props: Props) {
  if (props.skeleton) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-card" />
        ))}
        <div className="h-8 w-24 animate-pulse rounded-lg bg-card" />
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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Apellido</Label>
          <Input
            id="lastName"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dateOfBirth">Fecha de nacimiento</Label>
        <input
          id="dateOfBirth"
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => set("dateOfBirth", e.target.value)}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gender">Género</Label>
        <select
          id="gender"
          value={form.gender}
          onChange={(e) => set("gender", e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Seleccionar</option>
          <option value="male">Masculino</option>
          <option value="female">Femenino</option>
          <option value="other">Otro</option>
          <option value="prefer_not_to_say">Prefiero no decir</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="country">País de residencia</Label>
        <select
          id="country"
          value={form.country}
          onChange={(e) => set("country", e.target.value)}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Seleccionar país</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && (
        <p className="text-sm text-green-400">Perfil guardado correctamente.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
