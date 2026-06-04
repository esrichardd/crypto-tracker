import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { SignUpForm } from "@/features/auth/components/SignUpForm";

export default function SignUpPage() {
  return (
    <AuthLayout
      badge="Gratis para siempre"
      headline={
        <>
          Empieza a trackear
          <br />
          <span className="text-primary">en 30 segundos.</span>
        </>
      }
      subheadline="Crea tu cuenta y conecta tu portafolio. Sin tarjeta de crédito, sin límites de activos."
    >
      <SignUpForm />
    </AuthLayout>
  );
}
