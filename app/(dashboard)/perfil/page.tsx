import { Suspense } from "react";
import { ProfilePageServer } from "@/features/profile/components/ProfilePageServer";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { BinanceKeyForm } from "@/features/profile/components/BinanceKeyForm";

export default function PerfilPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Información personal y configuración de cuenta.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <div className="h-4 w-32 animate-pulse rounded bg-card" />
              <ProfileForm skeleton />
            </section>
            <section className="flex flex-col gap-3">
              <div className="h-4 w-32 animate-pulse rounded bg-card" />
              <BinanceKeyForm skeleton />
            </section>
          </div>
        }
      >
        <ProfilePageServer />
      </Suspense>
    </div>
  );
}
