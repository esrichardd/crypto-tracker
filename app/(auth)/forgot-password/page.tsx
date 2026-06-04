import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      badge="Seguridad"
      headline={
        <>
          Tu cuenta,
          <br />
          <span className="text-primary">siempre protegida.</span>
        </>
      }
      subheadline="Recupera el acceso a tu portafolio en segundos. Te enviamos un código a tu correo."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
