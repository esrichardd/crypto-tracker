import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getAssets } from "@/features/assets/api/get-assets";
import { handleApiError } from "@/lib/api/handle-error";

export async function GET() {
  try {
    await requireSession();
    const data = await getAssets();
    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
