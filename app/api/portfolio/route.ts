import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getPortfolio } from "@/features/portfolio/api/get-portfolio";
import { handleApiError } from "@/lib/api/handle-error";

export async function GET() {
  try {
    const session = await requireSession();
    const data = await getPortfolio(session.user.id);
    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
