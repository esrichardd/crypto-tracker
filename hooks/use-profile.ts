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
