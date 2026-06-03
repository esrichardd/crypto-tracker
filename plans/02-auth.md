# Plan 02 — Authentication

## Objective

Set up Neon Auth for user registration and login. Protect all dashboard routes via middleware. Expose a server-side session helper used by all API routes and Server Components.

## Dependencies

- Plan 01 (DB schema) must be complete.
- Neon Auth must be enabled in the Neon Console: **Project → Branch → Auth → Configuration**.
- Copy the **Auth URL** from that page — you'll need it for `NEON_AUTH_BASE_URL`.

---

## 1. Install Neon Auth SDK

```bash
pnpm add @neondatabase/auth@latest
```

---

## 2. Environment Variables

Add to `.env.local`:

```bash
# From Neon Console → Project → Branch → Auth → Configuration
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth

# Generate with: openssl rand -base64 32
NEON_AUTH_COOKIE_SECRET=your-secret-at-least-32-characters-long
```

Also add `NEON_AUTH_BASE_URL` to `CLAUDE.md` env vars section (update it).

---

## 3. Auth Server Instance

Single instance — provides `.handler()`, `.middleware()`, `.getSession()`, and all server-side auth methods.

**File:** `lib/auth/server.ts`

```ts
import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
```

---

## 4. Session Helpers

Add convenience helpers below the `auth` export in the same file:

```ts
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
```

Full `lib/auth/server.ts`:

```ts
import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

export async function getServerSession() {
  const { data: session } = await auth.getSession();
  return session;
}

export async function requireSession() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}
```

---

## 5. Auth API Route

**File:** `app/api/auth/[...path]/route.ts`

```ts
import { auth } from "@/lib/auth/server";

export const { GET, POST } = auth.handler();
```

> Note: the dynamic segment is `[...path]`, not `[...all]`.

---

## 6. Middleware — Protect Dashboard Routes

> **Next.js 16 note:** uses `proxy.ts` (not `middleware.ts`). On Next.js ≤15 rename to `middleware.ts` and export `default function middleware` instead of `proxy`.

**File:** `proxy.ts` (project root)

```ts
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
```

---

## 7. Auth Client (for Client Components)

**File:** `lib/auth/client.ts`

```ts
"use client";

import { createAuthClient } from "@neondatabase/auth/next";

export const authClient = createAuthClient();
```

> No arguments needed — the client auto-detects the auth base URL via the API route.

---

## 8. Sign-In Page

Uses Server Actions + `useActionState` (React 19).

**File:** `app/(auth)/sign-in/actions.ts`

```ts
"use server";

import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const { error } = await auth.signIn.email({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message || "Correo o contraseña incorrectos." };
  }

  redirect("/");
}
```

**File:** `app/(auth)/sign-in/page.tsx`

```tsx
import { SignInForm } from "@/features/auth/components/SignInForm";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <SignInForm />
    </main>
  );
}
```

**File:** `features/auth/components/SignInForm.tsx`

```tsx
"use client";

import { useActionState } from "react";
import { signInWithEmail } from "@/app/(auth)/sign-in/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Iniciar sesión
      </h1>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Cargando..." : "Entrar"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <a href="/sign-up" className="text-primary underline">
          Regístrate
        </a>
      </p>
    </div>
  );
}
```

---

## 9. Sign-Up Page

**File:** `app/(auth)/sign-up/actions.ts`

```ts
"use server";

import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const { error } = await auth.signUp.email({
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message || "No se pudo crear la cuenta." };
  }

  redirect("/");
}
```

**File:** `app/(auth)/sign-up/page.tsx`

```tsx
import { SignUpForm } from "@/features/auth/components/SignUpForm";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <SignUpForm />
    </main>
  );
}
```

**File:** `features/auth/components/SignUpForm.tsx`

```tsx
"use client";

import { useActionState } from "react";
import { signUpWithEmail } from "@/app/(auth)/sign-up/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Crear cuenta
      </h1>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" type="text" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Cargando..." : "Registrarse"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <a href="/sign-in" className="text-primary underline">
          Inicia sesión
        </a>
      </p>
    </div>
  );
}
```

---

## 10. Sign-Out

Sign-out is a simple link or button that calls the auth API route:

```tsx
// In Header or any component
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
      }}
    >
      Cerrar sesión
    </button>
  );
}
```

---

## 11. Directory Structure

```
app/
  (auth)/
    sign-in/
      actions.ts      — Server Action
      page.tsx
    sign-up/
      actions.ts      — Server Action
      page.tsx
  api/
    auth/
      [...path]/
        route.ts

features/
  auth/
    components/
      SignInForm.tsx
      SignUpForm.tsx

lib/
  auth/
    server.ts         — createNeonAuth + session helpers
    client.ts         — createAuthClient

proxy.ts              — Next.js 16 middleware (protects routes)
```

---

## 12. Verification Checklist

- [ ] `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` set in `.env.local`.
- [ ] `/sign-in` renders without errors.
- [ ] `/sign-up` renders without errors.
- [ ] Registering a new user redirects to `/`.
- [ ] Signing in with correct credentials redirects to `/`.
- [ ] Signing in with wrong credentials shows Spanish error message.
- [ ] Accessing `/` without session redirects to `/sign-in`.
- [ ] Accessing `/transactions` without session redirects to `/sign-in`.
- [ ] `requireSession()` throws `'Unauthorized'` when called without a valid session.
- [ ] `getServerSession()` returns `null` for unauthenticated requests.
