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
