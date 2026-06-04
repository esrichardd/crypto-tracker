import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";

const authMiddleware = auth.middleware({ loginUrl: "/sign-in" });

export default function middleware(request: NextRequest) {
  // Server Actions post to the page URL with the "next-action" header.
  // API routes handle their own auth via requireSession().
  // Skip the auth middleware for both — avoid redirect loop.
  if (
    request.headers.get("next-action") ||
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  return authMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!sign-in|sign-up|forgot-password|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
