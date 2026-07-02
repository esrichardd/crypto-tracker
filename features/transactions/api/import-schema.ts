import { z } from "zod";
import { isDateOnlyString } from "@/lib/utils/dates";

export const importRowSchema = z.object({
  assetId: z.string().min(1),
  type: z.enum(["buy", "sell"]),
  priceUsd: z.string().regex(/^\d+(\.\d+)?$/, "Debe ser un número positivo"),
  quantity: z.string().regex(/^\d+(\.\d+)?$/, "Debe ser un número positivo"),
  fee: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional()
    .default("0"),
  date: z.string().refine(isDateOnlyString, "Fecha invalida"),
  notes: z.string().max(500).optional(),
  externalId: z.string().min(1),
});

export type ImportRowInput = z.infer<typeof importRowSchema>;
