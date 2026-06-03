# Plan 07 — Profile & Binance API Key

## Objective

Build the `/perfil` page with two sections:

1. **Personal profile** — first name, last name, date of birth, gender, country of residence.
2. **Binance API Key** — securely store and display `api_key` + `api_secret` (encrypted at rest, never shown in full after save).

## Dependencies

- Plans 01, 02, 03, 04 complete.
- `ENCRYPTION_KEY` env var (32-byte hex string) must be added.

---

## 1. Environment Variable

Add to `.env.local`:

```
ENCRYPTION_KEY=<32-byte hex string>  # openssl rand -hex 32
```

Add to `.env.example` (no value):

```
ENCRYPTION_KEY=
```

---

## 2. Schema — New Tables

**File:** `lib/db/schema.ts` — append to existing schema.

### Enums

```ts
export const genderEnum = pgEnum("gender", [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
]);
```

### `user_profiles`

```ts
export const userProfiles = pgTable("user_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  dateOfBirth: text("date_of_birth"), // ISO date string: 'YYYY-MM-DD'
  gender: genderEnum("gender"),
  country: text("country"), // ISO 3166-1 alpha-2 country code: 'MX', 'US', etc.
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

### `exchange_api_keys`

```ts
export const exchangeApiKeys = pgTable(
  "exchange_api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").notNull(),
    exchange: text("exchange").notNull().default("binance"), // extensible for future exchanges
    apiKeyEncrypted: text("api_key_encrypted").notNull(),
    apiKeyHint: text("api_key_hint").notNull(), // last 4 chars, shown in UI
    apiSecretEncrypted: text("api_secret_encrypted").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userExchangeUnique: unique().on(table.userId, table.exchange),
  }),
);
```

Apply changes:

```bash
pnpm drizzle-kit push
```

---

## 3. Encryption Utility

**File:** `lib/crypto.ts`

Uses Node's built-in `crypto` module — no new dependencies.

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all hex)
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
```

---

## 4. Types

**File:** `features/profile/types/index.ts`

```ts
export type UserProfile = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  country: string | null;
};

export type ExchangeApiKey = {
  id: string;
  exchange: string;
  apiKeyHint: string; // last 4 chars only — never return full key to client
  createdAt: string;
  updatedAt: string;
};

export type UpsertProfileInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // 'YYYY-MM-DD'
  gender: UserProfile["gender"];
  country: string;
};

export type SaveApiKeyInput = {
  apiKey: string;
  apiSecret: string;
};
```

---

## 5. Data Fetchers

**File:** `features/profile/api/get-profile.ts`

```ts
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserProfile } from "../types";

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const result = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return result[0] ?? null;
}
```

**File:** `features/profile/api/get-api-key.ts`

```ts
import { db } from "@/lib/db";
import { exchangeApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { ExchangeApiKey } from "../types";

export async function getBinanceApiKey(
  userId: string,
): Promise<ExchangeApiKey | null> {
  const result = await db
    .select({
      id: exchangeApiKeys.id,
      exchange: exchangeApiKeys.exchange,
      apiKeyHint: exchangeApiKeys.apiKeyHint,
      createdAt: exchangeApiKeys.createdAt,
      updatedAt: exchangeApiKeys.updatedAt,
    })
    .from(exchangeApiKeys)
    .where(
      and(
        eq(exchangeApiKeys.userId, userId),
        eq(exchangeApiKeys.exchange, "binance"),
      ),
    )
    .limit(1);

  return result[0]
    ? {
        ...result[0],
        createdAt: result[0].createdAt.toISOString(),
        updatedAt: result[0].updatedAt.toISOString(),
      }
    : null;
}
```

---

## 6. API Routes

### 6.1 Profile — GET & PUT

**File:** `app/api/profile/route.ts`

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth"; // existing auth helper
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";

const upsertProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).nullable(),
  country: z.string().length(2).toUpperCase(),
});

export async function GET() {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.userId))
    .limit(1);

  return NextResponse.json(profile[0] ?? null);
}

export async function PUT(req: Request) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = upsertProfileSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );

  const existing = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(userProfiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, session.userId));
  } else {
    await db.insert(userProfiles).values({
      id: createId(),
      userId: session.userId,
      ...parsed.data,
    });
  }

  return NextResponse.json({ success: true });
}
```

### 6.2 Binance API Key — GET, PUT, DELETE

**File:** `app/api/profile/binance-key/route.ts`

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { encrypt } from "@/lib/crypto";

const saveKeySchema = z.object({
  apiKey: z.string().min(10),
  apiSecret: z.string().min(10),
});

export async function GET() {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db
    .select({
      id: exchangeApiKeys.id,
      exchange: exchangeApiKeys.exchange,
      apiKeyHint: exchangeApiKeys.apiKeyHint,
      createdAt: exchangeApiKeys.createdAt,
      updatedAt: exchangeApiKeys.updatedAt,
    })
    .from(exchangeApiKeys)
    .where(
      and(
        eq(exchangeApiKeys.userId, session.userId),
        eq(exchangeApiKeys.exchange, "binance"),
      ),
    )
    .limit(1);

  return NextResponse.json(result[0] ?? null);
}

export async function PUT(req: Request) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = saveKeySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );

  const { apiKey, apiSecret } = parsed.data;
  const apiKeyEncrypted = encrypt(apiKey);
  const apiSecretEncrypted = encrypt(apiSecret);
  const apiKeyHint = apiKey.slice(-4);

  const existing = await db
    .select({ id: exchangeApiKeys.id })
    .from(exchangeApiKeys)
    .where(
      and(
        eq(exchangeApiKeys.userId, session.userId),
        eq(exchangeApiKeys.exchange, "binance"),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(exchangeApiKeys)
      .set({
        apiKeyEncrypted,
        apiSecretEncrypted,
        apiKeyHint,
        updatedAt: new Date(),
      })
      .where(eq(exchangeApiKeys.id, existing[0].id));
  } else {
    await db.insert(exchangeApiKeys).values({
      id: createId(),
      userId: session.userId,
      exchange: "binance",
      apiKeyEncrypted,
      apiSecretEncrypted,
      apiKeyHint,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .delete(exchangeApiKeys)
    .where(
      and(
        eq(exchangeApiKeys.userId, session.userId),
        eq(exchangeApiKeys.exchange, "binance"),
      ),
    );

  return NextResponse.json({ success: true });
}
```

---

## 7. TanStack Query Hooks

**File:** `hooks/use-profile.ts`

```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserProfile, UpsertProfileInput } from "@/features/profile/types";

export function useProfile() {
  return useQuery<UserProfile | null>({
    queryKey: ["profile"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
  });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertProfileInput) =>
      fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
```

**File:** `hooks/use-binance-key.ts`

```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExchangeApiKey, SaveApiKeyInput } from "@/features/profile/types";

export function useBinanceKey() {
  return useQuery<ExchangeApiKey | null>({
    queryKey: ["binance-key"],
    queryFn: () => fetch("/api/profile/binance-key").then((r) => r.json()),
  });
}

export function useSaveBinanceKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveApiKeyInput) =>
      fetch("/api/profile/binance-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["binance-key"] }),
  });
}

export function useDeleteBinanceKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/profile/binance-key", { method: "DELETE" }).then((r) =>
        r.json(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["binance-key"] }),
  });
}
```

---

## 8. Components

### 8.1 ProfileForm

**File:** `features/profile/components/ProfileForm.tsx`

- `"use client"` — uses `react-hook-form` + Zod resolver.
- Fields: `firstName`, `lastName`, `dateOfBirth` (date input), `gender` (Select), `country` (Select with country list).
- On submit → `useUpsertProfile` mutation → toast success/error.
- Skeleton variant: two rows of input skeletons.

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useUpsertProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/countries"; // ISO 3166 list
import type { UserProfile } from "../types";

const schema = z.object({
  firstName: z.string().min(1, "Requerido"),
  lastName: z.string().min(1, "Requerido"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).nullable(),
  country: z.string().length(2),
});

type Props =
  | { skeleton: true }
  | { skeleton?: false; profile: UserProfile | null };

export function ProfileForm(props: Props) {
  if (props.skeleton) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded-md bg-card"
          />
        ))}
        <div className="h-9 w-24 animate-pulse rounded-md bg-card" />
      </div>
    );
  }

  return <ProfileFormInner profile={props.profile} />;
}

function ProfileFormInner({ profile }: { profile: UserProfile | null }) {
  const { mutate, isPending } = useUpsertProfile();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      dateOfBirth: profile?.dateOfBirth ?? "",
      gender: profile?.gender ?? null,
      country: profile?.country ?? "",
    },
  });

  function onSubmit(values: z.infer<typeof schema>) {
    mutate(values, {
      onSuccess: () => toast.success("Perfil actualizado"),
      onError: () => toast.error("Error al guardar"),
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellido</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de nacimiento</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Género</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value ?? undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Femenino</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                  <SelectItem value="prefer_not_to_say">
                    Prefiero no decir
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>País de residencia</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar país" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </Form>
  );
}
```

### 8.2 BinanceKeyForm

**File:** `features/profile/components/BinanceKeyForm.tsx`

- `"use client"`.
- If key exists: shows `****...{hint}` badge + "Actualizar" and "Eliminar" buttons.
- If no key: shows two password inputs (API Key, API Secret) with toggle visibility button.
- On save → `useSaveBinanceKey`. On delete → confirmation dialog → `useDeleteBinanceKey`.
- Skeleton variant: two input skeletons.

```tsx
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import {
  useSaveBinanceKey,
  useDeleteBinanceKey,
} from "@/hooks/use-binance-key";
import { toast } from "sonner";
import type { ExchangeApiKey } from "../types";

const schema = z.object({
  apiKey: z.string().min(10, "API Key inválida"),
  apiSecret: z.string().min(10, "API Secret inválida"),
});

type Props =
  | { skeleton: true }
  | { skeleton?: false; existingKey: ExchangeApiKey | null };

export function BinanceKeyForm(props: Props) {
  if (props.skeleton) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-10 w-full animate-pulse rounded-md bg-card" />
        <div className="h-10 w-full animate-pulse rounded-md bg-card" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-card" />
      </div>
    );
  }

  return <BinanceKeyFormInner existingKey={props.existingKey} />;
}

function BinanceKeyFormInner({
  existingKey,
}: {
  existingKey: ExchangeApiKey | null;
}) {
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [editing, setEditing] = useState(!existingKey);

  const { mutate: save, isPending: saving } = useSaveBinanceKey();
  const { mutate: remove, isPending: removing } = useDeleteBinanceKey();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { apiKey: "", apiSecret: "" },
  });

  function onSubmit(values: z.infer<typeof schema>) {
    save(values, {
      onSuccess: () => {
        toast.success("API Key guardada");
        setEditing(false);
      },
      onError: () => toast.error("Error al guardar"),
    });
  }

  function onDelete() {
    remove(undefined, {
      onSuccess: () => {
        toast.success("API Key eliminada");
        setEditing(true);
      },
      onError: () => toast.error("Error al eliminar"),
    });
  }

  if (!editing && existingKey) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <span className="font-mono text-sm text-muted-foreground">
            ••••••••••••{existingKey.apiKeyHint}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            Actualizado{" "}
            {new Date(existingKey.updatedAt).toLocaleDateString("es")}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Actualizar key
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={removing}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar API Key?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará permanentemente. Los features que dependan de
                  ella dejarán de funcionar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="apiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="Pega tu API Key de Binance"
                    {...field}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 text-muted-foreground"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="apiSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Secret</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    placeholder="Pega tu API Secret de Binance"
                    {...field}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 text-muted-foreground"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar API Key"}
          </Button>
          {existingKey && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
```

---

## 9. Country List Utility

**File:** `lib/countries.ts`

Static list of `{ code: string; name: string }` objects for all ISO 3166-1 alpha-2 countries, with Spanish names. Used only in `ProfileForm`.

```ts
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "AR", name: "Argentina" },
  { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brasil" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "CU", name: "Cuba" },
  { code: "EC", name: "Ecuador" },
  { code: "SV", name: "El Salvador" },
  { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" },
  { code: "MX", name: "México" },
  { code: "NI", name: "Nicaragua" },
  { code: "PA", name: "Panamá" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Perú" },
  { code: "DO", name: "República Dominicana" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
  { code: "US", name: "Estados Unidos" },
  { code: "ES", name: "España" },
  // ... extend as needed
];
```

---

## 10. Server Data Component

**File:** `features/profile/components/ProfilePageServer.tsx`

```ts
import { getServerSession } from "@/lib/auth";
import { getProfile } from "../api/get-profile";
import { getBinanceApiKey } from "../api/get-api-key";
import { ProfileForm } from "./ProfileForm";
import { BinanceKeyForm } from "./BinanceKeyForm";

export async function ProfilePageServer() {
  const session = await getServerSession();
  if (!session) return null;

  const [profile, binanceKey] = await Promise.all([
    getProfile(session.userId),
    getBinanceApiKey(session.userId),
  ]);

  return (
    <>
      <ProfileForm profile={profile} />
      <BinanceKeyForm existingKey={binanceKey} />
    </>
  );
}
```

---

## 11. Page

**File:** `app/(dashboard)/perfil/page.tsx`

```tsx
import { Suspense } from "react";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { BinanceKeyForm } from "@/features/profile/components/BinanceKeyForm";
import { ProfilePageServer } from "@/features/profile/components/ProfilePageServer";

export default function PerfilPage() {
  return (
    <div className="flex flex-col gap-8 p-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Información personal y configuración de cuenta.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Datos personales
        </h2>
        <Suspense fallback={<ProfileForm skeleton />}>
          {/* ProfilePageServer renders ProfileForm with data */}
        </Suspense>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Binance API Key
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Usada para sincronizar transacciones automáticamente. Solo necesita
            permisos de lectura.
          </p>
        </div>
        <Suspense fallback={<BinanceKeyForm skeleton />}>
          {/* ProfilePageServer renders BinanceKeyForm with data */}
        </Suspense>
      </section>
    </div>
  );
}
```

> **Note:** `ProfilePageServer` fetches both resources in parallel and renders both forms. Wrap it in a single `<Suspense>` or split into two separate server components if independent loading is preferred.

---

## 12. Navigation

Add "Perfil" link to the sidebar/nav in `components/ui/sidebar` (or wherever the nav is defined).

```tsx
{ href: "/perfil", label: "Perfil", icon: UserIcon }
```

---

## 13. Checklist

- [ ] `ENCRYPTION_KEY` added to `.env.local` and `.env.example`
- [ ] `genderEnum`, `userProfiles`, `exchangeApiKeys` added to schema
- [ ] `pnpm drizzle-kit push` run successfully
- [ ] `lib/crypto.ts` implemented (AES-256-GCM)
- [ ] `lib/countries.ts` created
- [ ] `features/profile/types/index.ts` created
- [ ] `features/profile/api/get-profile.ts` created
- [ ] `features/profile/api/get-api-key.ts` created
- [ ] `app/api/profile/route.ts` (GET + PUT) created
- [ ] `app/api/profile/binance-key/route.ts` (GET + PUT + DELETE) created
- [ ] `hooks/use-profile.ts` created
- [ ] `hooks/use-binance-key.ts` created
- [ ] `features/profile/components/ProfileForm.tsx` created (with skeleton)
- [ ] `features/profile/components/BinanceKeyForm.tsx` created (with skeleton)
- [ ] `features/profile/components/ProfilePageServer.tsx` created
- [ ] `app/(dashboard)/perfil/page.tsx` created
- [ ] Nav updated with Perfil link
- [ ] All user-visible text in Spanish ✓
- [ ] No `any` types ✓
- [ ] `pnpm build` passes
