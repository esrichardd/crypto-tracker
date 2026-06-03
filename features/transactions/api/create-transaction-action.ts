"use server";

import { requireSession } from "@/lib/auth/server";
import { createTransaction } from "./create-transaction";
import { createTransactionSchema } from "./transaction-schema";
import { revalidatePath } from "next/cache";

export async function createTransactionAction(
  input: unknown,
): Promise<{ success: true } | { error: string }> {
  try {
    const session = await requireSession();

    const parsed = createTransactionSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      return { error: JSON.stringify(fields) };
    }

    await createTransaction(session.user.id, parsed.data);
    revalidatePath("/transactions");
    return { success: true };
  } catch (err) {
    console.error("[createTransactionAction] error:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { error: message };
  }
}
