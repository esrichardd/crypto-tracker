"use client";

import { useState } from "react";
import { ProfileForm } from "./ProfileForm";
import { BinanceKeyForm } from "./BinanceKeyForm";
import type { UserProfile, ExchangeApiKey } from "../types";

type Tab = "personal" | "apikeys";

type Props = {
  profile: UserProfile | null;
  binanceKey: ExchangeApiKey | null;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "personal", label: "Datos personales" },
  { id: "apikeys", label: "API Keys" },
];

export function ProfileTabsClient({ profile, binanceKey }: Props) {
  const [active, setActive] = useState<Tab>("personal");

  return (
    <div className="flex flex-col gap-5">
      {/* Tab nav */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={[
              "px-4 py-2.5 text-sm transition-colors",
              active === tab.id
                ? "border-b-2 border-primary font-medium text-primary"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "personal" && <ProfileForm profile={profile} />}
      {active === "apikeys" && <BinanceKeyForm existingKey={binanceKey} />}
    </div>
  );
}
