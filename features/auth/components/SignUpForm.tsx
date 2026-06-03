"use client";

import { useActionState } from "react";
import { signUpWithEmail } from "@/app/(auth)/sign-up/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Crear cuenta
      </h1>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" type="text" required />
        </div>
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
          {isPending ? "Cargando..." : "Registrarse"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <a href="/sign-in" className="text-primary underline">
          Inicia sesión
        </a>
      </p>
    </div>
  );
}
