"use client";

import { useActionState } from "react";
import { signInWithEmail } from "@/app/(auth)/sign-in/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Iniciar sesión
      </h1>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Cargando..." : "Entrar"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <a href="/sign-up" className="text-primary underline">
          Regístrate
        </a>
      </p>
    </div>
  );
}
