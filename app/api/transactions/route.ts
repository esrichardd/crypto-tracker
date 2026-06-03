import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getTransactions } from "@/features/transactions/api/get-transactions";
import { createTransaction } from "@/features/transactions/api/create-transaction";
import { createTransactionSchema } from "@/features/transactions/api/transaction-schema";
import { handleApiError } from "@/lib/api/handle-error";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = request.nextUrl;

    const data = await getTransactions(session.user.id, {
      assetId: searchParams.get("assetId") ?? undefined,
      type: (searchParams.get("type") as "buy" | "sell") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      page: searchParams.get("page")
        ? Number(searchParams.get("page"))
        : undefined,
      limit: searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
    });

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = await createTransaction(session.user.id, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
