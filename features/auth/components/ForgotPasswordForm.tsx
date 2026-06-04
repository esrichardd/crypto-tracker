"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./PasswordInput";
import { authClient } from "@/lib/auth/client";

type Step = "email" | "otp";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const { error } = await authClient.forgetPassword.emailOtp({ email });
    setIsPending(false);
    if (error) {
      setError(
        error.message ?? "No se pudo enviar el código. Intenta de nuevo.",
      );
      return;
    }
    setStep("otp");
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setIsPending(true);
    const { error } = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password,
    });
    setIsPending(false);
    if (error) {
      setError(
        error.message ?? "Código incorrecto o expirado. Intenta de nuevo.",
      );
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-medium text-foreground">
            ¡Contraseña actualizada!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-medium text-foreground">
          {step === "email" ? "Recuperar contraseña" : "Ingresa el código"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "email"
            ? "Te enviaremos un código a tu correo electrónico."
            : `Revisa tu bandeja de entrada en ${email} e ingresa el código recibido.`}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="nombre@correo.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
            size="lg"
          >
            {isPending ? "Enviando código..." : "Enviar código"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp">Código de verificación</Label>
            <Input
              id="otp"
              type="text"
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <PasswordInput
              id="newPassword"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) =>
                setPassword((e.target as HTMLInputElement).value)
              }
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
            size="lg"
          >
            {isPending ? "Guardando..." : "Cambiar contraseña"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            className="text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Reenviar código
          </button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/sign-in"
          className="font-medium text-primary hover:underline"
        >
          ← Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
