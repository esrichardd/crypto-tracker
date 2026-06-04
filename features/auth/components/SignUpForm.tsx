"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { signUpWithEmail } from "@/app/(auth)/sign-up/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./PasswordInput";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { cn } from "@/lib/utils";

// Returns 0-3: 0=empty, 1=weak, 2=medium, 3=strong
function getPasswordStrength(pw: string): number {
  if (pw.length === 0) return 0;
  if (pw.length < 8) return 1;
  let score = 1;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}

const STRENGTH_LABEL = ["", "Débil", "Media", "Fuerte"] as const;
const STRENGTH_COLOR = ["", "bg-danger", "bg-warning", "bg-success"] as const;

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password);

  if (password.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              strength >= level ? STRENGTH_COLOR[strength] : "bg-border",
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          "text-[11px] font-medium",
          strength === 1 && "text-danger",
          strength === 2 && "text-warning",
          strength === 3 && "text-success",
        )}
      >
        {STRENGTH_LABEL[strength]}
      </p>
    </div>
  );
}

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-medium text-foreground">Crear cuenta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Únete y empieza a gestionar tu portafolio
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {/* First name + last name row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">Nombre</Label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Juan"
              autoComplete="given-name"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Apellidos</Label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Pérez"
              autoComplete="family-name"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nombre@correo.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
          />
          <PasswordStrengthBar password={password} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Repetir contraseña</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Confirma tu contraseña"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {state?.error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="mt-1 w-full"
          size="lg"
        >
          {isPending ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">o regístrate con</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleAuthButton />

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-primary hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
