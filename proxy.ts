import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/sign-in",
});

export const config = {
  matcher: [
    // Protect all dashboard routes
    "/((?!sign-in|sign-up|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
