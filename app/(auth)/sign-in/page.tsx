import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { SignInForm } from "@/features/auth/components/SignInForm";

export default function SignInPage() {
  return (
    <AuthLayout
      badge="Mercado en vivo"
      headline={
        <>
          Tu portafolio cripto,
          <br />
          <span className="text-primary">siempre bajo control.</span>
        </>
      }
      subheadline="Rastrea precios en tiempo real, analiza tus ganancias y gestiona tus holdings desde un solo lugar."
    >
      <SignInForm />
    </AuthLayout>
  );
}
