import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { exchangeApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { encrypt } from "@/lib/crypto";
import { handleApiError } from "@/lib/api/handle-error";

const saveKeySchema = z.object({
  apiKey: z.string().min(10),
  apiSecret: z.string().min(10),
});

export async function GET() {
  try {
    const session = await requireSession();

    const result = await db
      .select({
        id: exchangeApiKeys.id,
        exchange: exchangeApiKeys.exchange,
        apiKeyHint: exchangeApiKeys.apiKeyHint,
        createdAt: exchangeApiKeys.createdAt,
        updatedAt: exchangeApiKeys.updatedAt,
      })
      .from(exchangeApiKeys)
      .where(
        and(
          eq(exchangeApiKeys.userId, session.user.id),
          eq(exchangeApiKeys.exchange, "binance"),
        ),
      )
      .limit(1);

    return NextResponse.json(
      result[0]
        ? {
            ...result[0],
            createdAt: result[0].createdAt.toISOString(),
            updatedAt: result[0].updatedAt.toISOString(),
          }
        : null,
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireSession();

    const body = await req.json();
    const parsed = saveKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { apiKey, apiSecret } = parsed.data;
    const apiKeyEncrypted = encrypt(apiKey);
    const apiSecretEncrypted = encrypt(apiSecret);
    const apiKeyHint = apiKey.slice(-4);

    const existing = await db
      .select({ id: exchangeApiKeys.id })
      .from(exchangeApiKeys)
      .where(
        and(
          eq(exchangeApiKeys.userId, session.user.id),
          eq(exchangeApiKeys.exchange, "binance"),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(exchangeApiKeys)
        .set({
          apiKeyEncrypted,
          apiSecretEncrypted,
          apiKeyHint,
          updatedAt: new Date(),
        })
        .where(eq(exchangeApiKeys.id, existing[0].id));
    } else {
      await db.insert(exchangeApiKeys).values({
        id: createId(),
        userId: session.user.id,
        exchange: "binance",
        apiKeyEncrypted,
        apiSecretEncrypted,
        apiKeyHint,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();

    await db
      .delete(exchangeApiKeys)
      .where(
        and(
          eq(exchangeApiKeys.userId, session.user.id),
          eq(exchangeApiKeys.exchange, "binance"),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
