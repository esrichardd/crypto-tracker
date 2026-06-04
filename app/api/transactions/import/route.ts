import { NextResponse } from "next/server";
import { importRowSchema } from "@/features/transactions/api/import-schema";
import { importTransactionsAction } from "@/features/transactions/api/import-transactions";
import { z } from "zod";

const bodySchema = z.object({
  rows: z.array(importRowSchema).min(1).max(500),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const result = await importTransactionsAction(parsed.data.rows);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
