"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage } from "@/lib/auth/errors";

export type AuthAccount = {
  id: string;
  providerId: string;
  accountId: string;
  scopes: string[];
};

const AUTH_ACCOUNTS_QUERY_KEY = ["auth-accounts"] as const;

function throwAuthError(error: unknown, fallback: string): never {
  throw new Error(getAuthErrorMessage(error, fallback));
}

export function useAuthAccounts() {
  return useQuery<AuthAccount[]>({
    queryKey: AUTH_ACCOUNTS_QUERY_KEY,
    queryFn: async () => {
      const result = await authClient.listAccounts();
      if (result.error) {
        throwAuthError(result.error, "No se pudieron cargar los métodos de acceso.");
      }

      return (result.data ?? []) as AuthAccount[];
    },
  });
}

export function useLinkGoogleAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/perfil?linked=google",
        errorCallbackURL: "/perfil?linkError=google",
      });

      if (result.error) {
        throwAuthError(result.error, "No se pudo conectar Google.");
      }

      if (result.data?.url) {
        window.location.href = result.data.url;
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_ACCOUNTS_QUERY_KEY });
    },
  });
}

export function useRequestPasswordOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const result = await authClient.forgetPassword.emailOtp({ email });
      if (result.error) {
        throwAuthError(result.error, "No se pudo enviar el código.");
      }

      return result.data;
    },
  });
}

export function useCreatePasswordWithOtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      otp,
      password,
    }: {
      email: string;
      otp: string;
      password: string;
    }) => {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password,
      });

      if (result.error) {
        throwAuthError(result.error, "No se pudo crear la contraseña.");
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_ACCOUNTS_QUERY_KEY });
    },
  });
}

export function useChangeAuthPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (result.error) {
        throwAuthError(result.error, "No se pudo cambiar la contraseña.");
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_ACCOUNTS_QUERY_KEY });
    },
  });
}
