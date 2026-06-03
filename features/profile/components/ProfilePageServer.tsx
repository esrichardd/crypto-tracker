import { requireSession } from "@/lib/auth/server";
import { getProfile } from "../api/get-profile";
import { getBinanceApiKey } from "../api/get-api-key";
import { ProfileForm } from "./ProfileForm";
import { BinanceKeyForm } from "./BinanceKeyForm";

export async function ProfilePageServer() {
  const session = await requireSession();

  const [profile, binanceKey] = await Promise.all([
    getProfile(session.user.id),
    getBinanceApiKey(session.user.id),
  ]);

  return (
    <>
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Datos personales
          </h2>
        </div>
        <ProfileForm profile={profile} />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Binance API Key
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Usada para sincronizar transacciones automáticamente. Solo requiere
            permisos de lectura.
          </p>
        </div>
        <BinanceKeyForm existingKey={binanceKey} />
      </section>
    </>
  );
}
