import { z } from "zod";
import { isDateOnlyString } from "@/lib/utils/dates";

export const createTransactionSchema = z.object({
  assetId: z.string().min(1),
  type: z.enum(["buy", "sell"]),
  priceUsd: z.string().regex(/^\d+(\.\d+)?$/, "Must be a positive number"),
  quantity: z.string().regex(/^\d+(\.\d+)?$/, "Must be a positive number"),
  fee: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional()
    .default("0"),
  date: z.string().refine(isDateOnlyString, "Fecha invalida"),
  notes: z.string().max(500).optional(),
});

export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;
