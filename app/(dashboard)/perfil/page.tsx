import { Suspense } from "react";
import { ProfilePageServer } from "@/features/profile/components/ProfilePageServer";
import { ProfileHeroSkeleton } from "@/features/profile/components/ProfileHero";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { BinanceKeyForm } from "@/features/profile/components/BinanceKeyForm";
import { AuthMethodsForm } from "@/features/profile/components/AuthMethodsForm";

export default function PerfilPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-0 p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Información personal y configuración de cuenta.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col gap-5">
            <ProfileHeroSkeleton />
            <ProfileForm skeleton />
            <AuthMethodsForm skeleton />
            <BinanceKeyForm skeleton />
          </div>
        }
      >
        <ProfilePageServer />
      </Suspense>
    </div>
  );
}
