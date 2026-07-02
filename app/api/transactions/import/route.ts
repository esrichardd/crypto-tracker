import { NextResponse } from "next/server";
import { importRowSchema } from "@/features/transactions/api/import-schema";
import { importTransactionsAction } from "@/features/transactions/api/import-transactions";
import { handleApiError } from "@/lib/api/handle-error";
import { z } from "zod";

const bodySchema = z.object({
  rows: z.array(importRowSchema).min(1).max(500),
});

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud debe ser JSON valido." },
        { status: 400 },
      );
    }

    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload invalido.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await importTransactionsAction(parsed.data.rows);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
