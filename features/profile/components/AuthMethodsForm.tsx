"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Link2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import {
  useAuthAccounts,
  useChangeAuthPassword,
  useCreatePasswordWithOtp,
  useLinkGoogleAccount,
  useRequestPasswordOtp,
} from "@/hooks/use-auth-accounts";

type Props =
  | { skeleton: true }
  | { skeleton?: false; userEmail: string | null };

type PasswordSetupStep = "idle" | "otp";

export function AuthMethodsForm(props: Props) {
  if (props.skeleton) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="h-4 w-44 animate-pulse rounded bg-background" />
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className="h-12 w-full animate-pulse rounded-lg bg-background" />
          <div className="h-12 w-full animate-pulse rounded-lg bg-background" />
          <div className="h-9 w-36 animate-pulse rounded-lg bg-background" />
        </div>
      </div>
    );
  }

  return <AuthMethodsFormInner userEmail={props.userEmail} />;
}

function AuthMethodsFormInner({ userEmail }: { userEmail: string | null }) {
  const searchParams = useSearchParams();
  const { data: accounts = [], isLoading, error: accountsError } = useAuthAccounts();
  const linkGoogle = useLinkGoogleAccount();
  const requestOtp = useRequestPasswordOtp();
  const createPassword = useCreatePasswordWithOtp();
  const changePassword = useChangeAuthPassword();

  const [setupStep, setSetupStep] = useState<PasswordSetupStep>("idle");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [changedPassword, setChangedPassword] = useState("");
  const [changedConfirmPassword, setChangedConfirmPassword] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasGoogle = accounts.some((account) => account.providerId === "google");
  const hasPassword = accounts.some(
    (account) => account.providerId === "credential",
  );
  const linkedMessage =
    searchParams.get("linked") === "google"
      ? "Google conectado correctamente."
      : null;
  const linkErrorMessage =
    searchParams.get("linkError") === "google"
      ? "No se pudo conectar Google. Intenta de nuevo."
      : null;

  function resetFeedback() {
    setError(null);
    setSuccess(null);
  }

  function errorMessage(value: unknown, fallback: string) {
    return getAuthErrorMessage(value, fallback);
  }

  function handleLinkGoogle() {
    resetFeedback();
    linkGoogle.mutate(undefined, {
      onError: (value) => {
        setError(errorMessage(value, "No se pudo conectar Google."));
      },
    });
  }

  function handleRequestOtp() {
    resetFeedback();

    if (!userEmail) {
      setError("Tu cuenta no tiene un correo disponible.");
      return;
    }

    requestOtp.mutate(userEmail, {
      onSuccess: () => {
        setSetupStep("otp");
        setSuccess("Código enviado.");
      },
      onError: (value) => {
        setError(errorMessage(value, "No se pudo enviar el código."));
      },
    });
  }

  function handleCreatePassword(e: React.FormEvent) {
    e.preventDefault();
    resetFeedback();

    if (!userEmail) {
      setError("Tu cuenta no tiene un correo disponible.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    createPassword.mutate(
      { email: userEmail, otp, password: newPassword },
      {
        onSuccess: () => {
          setSetupStep("idle");
          setOtp("");
          setNewPassword("");
          setConfirmPassword("");
          setSuccess("Contraseña creada correctamente.");
        },
        onError: (value) => {
          setError(errorMessage(value, "No se pudo crear la contraseña."));
        },
      },
    );
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    resetFeedback();

    if (changedPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (changedPassword !== changedConfirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    changePassword.mutate(
      {
        currentPassword,
        newPassword: changedPassword,
      },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setChangedPassword("");
          setChangedConfirmPassword("");
          setSuccess("Contraseña actualizada correctamente.");
        },
        onError: (value) => {
          setError(errorMessage(value, "No se pudo cambiar la contraseña."));
        },
      },
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <ShieldCheck size={15} className="text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Métodos de acceso
          </p>
          <p className="text-xs text-muted-foreground">
            Google y contraseña para la misma cuenta
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="h-12 w-full animate-pulse rounded-lg bg-background" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-background" />
          </div>
        ) : (
          <>
            <AuthMethodRow
              icon={<Mail size={15} />}
              title="Correo y contraseña"
              value={userEmail ?? "Sin correo"}
              active={hasPassword}
              activeLabel="Configurada"
              inactiveLabel="Pendiente"
            />
            <AuthMethodRow
              icon={<Link2 size={15} />}
              title="Google"
              value={hasGoogle ? "Conectado" : "No conectado"}
              active={hasGoogle}
              activeLabel="Conectado"
              inactiveLabel="Pendiente"
              action={
                hasGoogle ? null : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={linkGoogle.isPending}
                    onClick={handleLinkGoogle}
                  >
                    {linkGoogle.isPending ? "Conectando..." : "Conectar Google"}
                  </Button>
                )
              }
            />
          </>
        )}

        {accountsError && (
          <FeedbackMessage tone="error">
            {errorMessage(
              accountsError,
              "No se pudieron cargar los métodos de acceso.",
            )}
          </FeedbackMessage>
        )}
        {linkErrorMessage && (
          <FeedbackMessage tone="error">{linkErrorMessage}</FeedbackMessage>
        )}
        {linkedMessage && (
          <FeedbackMessage tone="success">{linkedMessage}</FeedbackMessage>
        )}
        {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}
        {success && <FeedbackMessage tone="success">{success}</FeedbackMessage>}

        {!isLoading && !hasPassword && (
          <PasswordSetupForm
            step={setupStep}
            email={userEmail}
            otp={otp}
            password={newPassword}
            confirmPassword={confirmPassword}
            isRequestingOtp={requestOtp.isPending}
            isCreatingPassword={createPassword.isPending}
            onRequestOtp={handleRequestOtp}
            onResendOtp={handleRequestOtp}
            onSubmit={handleCreatePassword}
            onOtpChange={setOtp}
            onPasswordChange={setNewPassword}
            onConfirmPasswordChange={setConfirmPassword}
          />
        )}

        {!isLoading && hasPassword && (
          <PasswordChangeForm
            currentPassword={currentPassword}
            newPassword={changedPassword}
            confirmPassword={changedConfirmPassword}
            isPending={changePassword.isPending}
            onCurrentPasswordChange={setCurrentPassword}
            onNewPasswordChange={setChangedPassword}
            onConfirmPasswordChange={setChangedConfirmPassword}
            onSubmit={handleChangePassword}
          />
        )}
      </div>
    </div>
  );
}

function AuthMethodRow({
  icon,
  title,
  value,
  active,
  activeLabel,
  inactiveLabel,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{value}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={
            active
              ? "inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs text-success"
              : "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground"
          }
        >
          <span
            className={
              active
                ? "h-1.5 w-1.5 rounded-full bg-success"
                : "h-1.5 w-1.5 rounded-full bg-muted-foreground"
            }
          />
          {active ? activeLabel : inactiveLabel}
        </span>
        {action}
      </div>
    </div>
  );
}

function PasswordSetupForm({
  step,
  email,
  otp,
  password,
  confirmPassword,
  isRequestingOtp,
  isCreatingPassword,
  onRequestOtp,
  onResendOtp,
  onSubmit,
  onOtpChange,
  onPasswordChange,
  onConfirmPasswordChange,
}: {
  step: PasswordSetupStep;
  email: string | null;
  otp: string;
  password: string;
  confirmPassword: string;
  isRequestingOtp: boolean;
  isCreatingPassword: boolean;
  onRequestOtp: () => void;
  onResendOtp: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onOtpChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}) {
  if (step === "idle") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <KeyRound size={14} className="mt-0.5 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Crea una contraseña para iniciar sesión también con correo.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!email || isRequestingOtp}
          onClick={onRequestOtp}
        >
          {isRequestingOtp ? "Enviando..." : "Enviar código"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="authOtp"
            className="text-xs uppercase tracking-wide text-muted-foreground"
          >
            Código
          </Label>
          <Input
            id="authOtp"
            value={otp}
            onChange={(event) => onOtpChange(event.target.value)}
            inputMode="numeric"
            maxLength={6}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="authNewPassword"
            className="text-xs uppercase tracking-wide text-muted-foreground"
          >
            Contraseña
          </Label>
          <PasswordInput
            id="authNewPassword"
            value={password}
            onChange={(event) =>
              onPasswordChange((event.target as HTMLInputElement).value)
            }
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="authConfirmPassword"
            className="text-xs uppercase tracking-wide text-muted-foreground"
          >
            Confirmar
          </Label>
          <PasswordInput
            id="authConfirmPassword"
            value={confirmPassword}
            onChange={(event) =>
              onConfirmPasswordChange(
                (event.target as HTMLInputElement).value,
              )
            }
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={isCreatingPassword} className="w-fit">
          {isCreatingPassword ? "Guardando..." : "Crear contraseña"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isRequestingOtp}
          onClick={onResendOtp}
          className="w-fit"
        >
          {isRequestingOtp ? "Enviando..." : "Reenviar código"}
        </Button>
      </div>
    </form>
  );
}

function PasswordChangeForm({
  currentPassword,
  newPassword,
  confirmPassword,
  isPending,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isPending: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="currentAuthPassword"
            className="text-xs uppercase tracking-wide text-muted-foreground"
          >
            Actual
          </Label>
          <PasswordInput
            id="currentAuthPassword"
            value={currentPassword}
            onChange={(event) =>
              onCurrentPasswordChange((event.target as HTMLInputElement).value)
            }
            autoComplete="current-password"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="changedAuthPassword"
            className="text-xs uppercase tracking-wide text-muted-foreground"
          >
            Nueva
          </Label>
          <PasswordInput
            id="changedAuthPassword"
            value={newPassword}
            onChange={(event) =>
              onNewPasswordChange((event.target as HTMLInputElement).value)
            }
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="changedAuthPasswordConfirm"
            className="text-xs uppercase tracking-wide text-muted-foreground"
          >
            Confirmar
          </Label>
          <PasswordInput
            id="changedAuthPasswordConfirm"
            value={confirmPassword}
            onChange={(event) =>
              onConfirmPasswordChange(
                (event.target as HTMLInputElement).value,
              )
            }
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Guardando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}

function FeedbackMessage({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  const className =
    tone === "error"
      ? "border-danger/30 bg-danger/10 text-danger"
      : "border-success/30 bg-success/10 text-success";

  return (
    <p
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${className}`}
    >
      <Icon size={14} />
      {children}
    </p>
  );
}
