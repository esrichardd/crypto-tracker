import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { handleApiError } from "@/lib/api/handle-error";

const upsertProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say"])
    .nullable()
    .optional(),
  country: z.string().length(2),
});

export async function GET() {
  try {
    const session = await requireSession();

    const result = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    return NextResponse.json(result[0] ?? null);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireSession();

    const body = await req.json();
    const parsed = upsertProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (existing[0]) {
      await db
        .update(userProfiles)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(userProfiles.userId, session.user.id));
    } else {
      await db.insert(userProfiles).values({
        id: createId(),
        userId: session.user.id,
        ...parsed.data,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
