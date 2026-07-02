import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { requireSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { opportunitySettings } from "@/lib/db/schema";
import { handleApiError } from "@/lib/api/handle-error";
import { DEFAULT_TARGET_ROI_PERCENT } from "@/features/opportunities/api/get-opportunity-settings";

const updateOpportunitySettingsSchema = z.object({
  targetRoiPercent: z.number().min(0).max(1000),
});

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db
      .select({
        targetRoiPercent: opportunitySettings.targetRoiPercent,
      })
      .from(opportunitySettings)
      .where(eq(opportunitySettings.userId, session.user.id))
      .limit(1);

    return NextResponse.json({
      targetRoiPercent:
        rows[0]?.targetRoiPercent === undefined
          ? DEFAULT_TARGET_ROI_PERCENT
          : Number(rows[0].targetRoiPercent),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const parsed = updateOpportunitySettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const targetRoiPercent = parsed.data.targetRoiPercent.toFixed(2);
    const existing = await db
      .select({ id: opportunitySettings.id })
      .from(opportunitySettings)
      .where(eq(opportunitySettings.userId, session.user.id))
      .limit(1);

    if (existing[0]) {
      await db
        .update(opportunitySettings)
        .set({ targetRoiPercent, updatedAt: new Date() })
        .where(eq(opportunitySettings.userId, session.user.id));
    } else {
      await db.insert(opportunitySettings).values({
        id: createId(),
        userId: session.user.id,
        targetRoiPercent,
      });
    }

    return NextResponse.json({
      success: true,
      targetRoiPercent: Number(targetRoiPercent),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
