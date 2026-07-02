"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const firstName = (formData.get("firstName") as string | null)?.trim() ?? "";
  const lastName = (formData.get("lastName") as string | null)?.trim() ?? "";
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  if (!firstName) {
    return { error: "El nombre es obligatorio." };
  }

  const { data, error } = await auth.signUp.email({
    name: `${firstName} ${lastName}`.trim(),
    email,
    password,
  });

  if (error) {
    return {
      error: getAuthErrorMessage(error, "No se pudo crear la cuenta."),
    };
  }

  // Persist firstName + lastName to user profile if we got a userId back
  const userId = (data as { user?: { id?: string } } | null)?.user?.id;
  if (userId) {
    await db
      .insert(userProfiles)
      .values({ userId, firstName, lastName })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { firstName, lastName },
      });
  }

  redirect("/");
}
