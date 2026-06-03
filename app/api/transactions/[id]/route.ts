import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { deleteTransaction } from "@/features/transactions/api/delete-transaction";
import { handleApiError } from "@/lib/api/handle-error";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await deleteTransaction(session.user.id, id);
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return handleApiError(err);
  }
}
