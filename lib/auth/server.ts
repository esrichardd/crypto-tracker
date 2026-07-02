import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // SameSite=Lax is required for OAuth cross-site redirects.
    // Default is "strict" which blocks the challenge cookie on the Neon → app redirect.
    sameSite: "lax",
  },
});

// Returns session or null — use in Server Components
export async function getServerSession() {
  const { data: session } = await auth.getSession();
  return session;
}

// Throws if not authenticated — use in API routes
export async function requireSession() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}
