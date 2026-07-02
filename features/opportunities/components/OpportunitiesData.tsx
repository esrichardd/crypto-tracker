import { requireSession } from "@/lib/auth/server";
import { getOpportunities } from "../api/get-opportunities";
import { getOpportunitySettings } from "../api/get-opportunity-settings";
import { OpportunitiesDashboard } from "./OpportunitiesDashboard";

export async function OpportunitiesData() {
  const session = await requireSession();
  const [data, settings] = await Promise.all([
    getOpportunities(session.user.id),
    getOpportunitySettings(session.user.id),
  ]);

  return (
    <OpportunitiesDashboard
      data={data}
      initialTargetRoi={settings.targetRoiPercent}
    />
  );
}
