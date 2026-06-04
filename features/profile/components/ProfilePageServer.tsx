import { requireSession } from "@/lib/auth/server";
import { getProfile } from "../api/get-profile";
import { getBinanceApiKey } from "../api/get-api-key";
import { ProfileHero } from "./ProfileHero";
import { ProfileForm } from "./ProfileForm";
import { BinanceKeyForm } from "./BinanceKeyForm";

export async function ProfilePageServer() {
  const session = await requireSession();

  const [profile, binanceKey] = await Promise.all([
    getProfile(session.user.id),
    getBinanceApiKey(session.user.id),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <ProfileHero
        profile={profile}
        binanceKey={binanceKey}
        userEmail={session.user.email ?? null}
      />
      <ProfileForm profile={profile} />
      <BinanceKeyForm existingKey={binanceKey} />
    </div>
  );
}
