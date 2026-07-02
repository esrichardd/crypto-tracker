import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { opportunitySettings } from "@/lib/db/schema";

export const DEFAULT_TARGET_ROI_PERCENT = 20;

export type OpportunitySettingsData = {
  targetRoiPercent: number;
};

export const getOpportunitySettings = cache(
  async (userId: string): Promise<OpportunitySettingsData> => {
    const rows = await db
      .select({
        targetRoiPercent: opportunitySettings.targetRoiPercent,
      })
      .from(opportunitySettings)
      .where(eq(opportunitySettings.userId, userId))
      .limit(1);

    return {
      targetRoiPercent:
        rows[0]?.targetRoiPercent === undefined
          ? DEFAULT_TARGET_ROI_PERCENT
          : Number(rows[0].targetRoiPercent),
    };
  },
);
