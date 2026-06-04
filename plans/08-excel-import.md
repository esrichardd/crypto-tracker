# Plan 08 — Excel Import (Transactions)

## Objective

Allow users to bulk-import transactions from an `.xlsx` file. The user uploads a file, sees a preview table with validation results (valid rows / rows with errors), and confirms the import. Duplicate rows (re-importing the same file) are silently skipped via `externalId`.

## Dependencies

- Plans 01, 02, 03, 06 complete.
- DB schema already supports `source: "csv"` and `externalId` — no migrations needed.

---

## New dependency

Add `xlsx` (SheetJS) for client-side Excel parsing:

```bash
pnpm add xlsx
```

No other dependencies. SheetJS handles `.xlsx` without a backend.

---

## Expected Excel format

The user's file must have these column headers in row 1 (case-insensitive):

| `symbol` | `type` | `price_usd` | `quantity` | `fee` | `date`     | `notes`     |
| -------- | ------ | ----------- | ---------- | ----- | ---------- | ----------- |
| BTC      | buy    | 65000       | 0.5        | 2.5   | 2024-01-15 | DCA mensual |
| ETH      | sell   | 3200        | 1.2        | 1     | 2024-02-20 |             |

- `symbol`: must match an existing asset (BTC, ETH, SOL, etc.).
- `type`: `buy` or `sell` (case-insensitive).
- `price_usd`, `quantity`: positive numbers.
- `fee`: optional, defaults to `0`.
- `date`: ISO date string (`YYYY-MM-DD`) or Excel serial date.
- `notes`: optional free text.

---

## File map

```
features/transactions/
  api/
    import-schema.ts              — Zod schema for a single import row
    import-transactions.ts        — Server Action: bulk insert with dedup
  components/
    ExcelImport.tsx               — Upload + preview + confirm (client component)
  types/
    index.ts                      — Add ImportPreviewRow type

app/
  (dashboard)/transactions/
    import/
      page.tsx                    — Thin page: loads assets, renders ExcelImport
    page.tsx                      — Add "Importar Excel" button (update)
  api/transactions/
    import/
      route.ts                    — POST handler: validates + bulk inserts
```

---

## 1. Types

**File:** `features/transactions/types/index.ts` — append:

```ts
// Row after client-side parsing and validation
export type ImportPreviewRow = {
  rowIndex: number; // 1-based row number in the Excel (for error messages)
  symbol: string;
  type: "buy" | "sell";
  priceUsd: string;
  quantity: string;
  fee: string;
  date: string; // ISO string after normalisation
  notes: string;
  assetId: string | null; // null = symbol not found in catalog
  error: string | null; // human-readable validation error, null = valid
};
```

---

## 2. Import row Zod schema

**File:** `features/transactions/api/import-schema.ts`

```ts
import { z } from "zod";

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
  date: z.string().datetime({ offset: true }),
  notes: z.string().max(500).optional(),
  externalId: z.string().min(1),
});

export type ImportRowInput = z.infer<typeof importRowSchema>;
```

---

## 3. Server Action — bulk insert

**File:** `features/transactions/api/import-transactions.ts`

```ts
"use server";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/server";
import type { ImportRowInput } from "./import-schema";

export type ImportResult = {
  inserted: number;
  skipped: number;
  error?: string;
};

export async function importTransactionsAction(
  rows: ImportRowInput[],
): Promise<ImportResult> {
  const session = await requireSession();
  const userId = session.user.id;

  if (rows.length === 0) return { inserted: 0, skipped: 0 };
  if (rows.length > 500)
    return {
      inserted: 0,
      skipped: 0,
      error: "Máximo 500 filas por importación.",
    };

  const values = rows.map((row) => ({
    userId,
    assetId: row.assetId,
    type: row.type,
    priceUsd: row.priceUsd,
    quantity: row.quantity,
    fee: row.fee ?? "0",
    date: new Date(row.date),
    notes: row.notes ?? null,
    source: "csv" as const,
    externalId: row.externalId,
  }));

  // Insert all rows; duplicates (same source + externalId) are silently skipped.
  const result = await db
    .insert(transactions)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: transactions.id });

  return {
    inserted: result.length,
    skipped: rows.length - result.length,
  };
}
```

---

## 4. API route — POST /api/transactions/import

**File:** `app/api/transactions/import/route.ts`

```ts
import { NextResponse } from "next/server";
import { importRowSchema } from "@/features/transactions/api/import-schema";
import { importTransactionsAction } from "@/features/transactions/api/import-transactions";
import { z } from "zod";

const bodySchema = z.object({
  rows: z.array(importRowSchema).min(1).max(500),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const result = await importTransactionsAction(parsed.data.rows);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
```

---

## 5. ExcelImport component

**File:** `features/transactions/components/ExcelImport.tsx`

This is the core client component. It owns the full import flow: upload → parse → preview → confirm.

```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatUSD, formatCrypto } from "@/lib/utils/formatters";
import type { Asset } from "@/lib/db/schema";
import type { ImportPreviewRow } from "../types";
import type { ImportRowInput } from "../api/import-schema";

type Props = { skeleton: true } | { skeleton?: false; assets: Asset[] };

// ----- Helpers -----

function normaliseType(raw: unknown): "buy" | "sell" | null {
  const s = String(raw ?? "")
    .toLowerCase()
    .trim();
  if (s === "buy" || s === "compra") return "buy";
  if (s === "sell" || s === "venta") return "sell";
  return null;
}

function normaliseDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;

  // Excel serial number
  if (typeof raw === "number") {
    const date = XLSX.SSF.parse_date_code(raw);
    if (!date) return null;
    const iso = new Date(Date.UTC(date.y, date.m - 1, date.d)).toISOString();
    return iso;
  }

  // String date
  const parsed = new Date(String(raw));
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normaliseNumber(raw: unknown): string | null {
  const n = Number(raw);
  if (isNaN(n) || n < 0) return null;
  return String(n);
}

// Stable content-based fingerprint for dedup (not for security, just uniqueness)
function makeExternalId(
  symbol: string,
  type: string,
  price: string,
  qty: string,
  date: string,
): string {
  return `csv|${symbol.toUpperCase()}|${type}|${price}|${qty}|${date.slice(0, 10)}`;
}

// Download a blank template
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["symbol", "type", "price_usd", "quantity", "fee", "date", "notes"],
    ["BTC", "buy", "65000", "0.5", "2.5", "2024-01-15", "DCA mensual"],
    ["ETH", "sell", "3200", "1.2", "1", "2024-02-20", ""],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
  XLSX.writeFile(wb, "template-transacciones.xlsx");
}

// ----- Main component -----

function ExcelImportInner({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Build symbol → assetId lookup
  const symbolMap = new Map(assets.map((a) => [a.symbol.toUpperCase(), a.id]));

  function parseFile(file: File) {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setRows([]);
      setFileName(null);
      setImportError("Solo se aceptan archivos .xlsx o .xls");
      return;
    }

    setFileName(file.name);
    setImportError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        header: 1,
        defval: "",
      }) as unknown[][];

      if (raw.length < 2) {
        setRows([]);
        setImportError("El archivo está vacío o no tiene datos.");
        return;
      }

      // Normalise headers (lowercase, trim)
      const headers = (raw[0] as string[]).map((h) =>
        String(h).toLowerCase().trim(),
      );

      const parsed: ImportPreviewRow[] = [];

      for (let i = 1; i < raw.length; i++) {
        const rowRaw = raw[i] as unknown[];
        const get = (key: string) => rowRaw[headers.indexOf(key)];

        const symbol = String(get("symbol") ?? "")
          .toUpperCase()
          .trim();
        const type = normaliseType(get("type"));
        const priceRaw = normaliseNumber(get("price_usd"));
        const quantityRaw = normaliseNumber(get("quantity"));
        const feeRaw = normaliseNumber(get("fee") ?? 0);
        const dateRaw = normaliseDate(get("date"));
        const notes = String(get("notes") ?? "").trim();

        const assetId = symbolMap.get(symbol) ?? null;

        let error: string | null = null;
        if (!symbol) error = "Symbol vacío";
        else if (!assetId)
          error = `Symbol "${symbol}" no encontrado en el catálogo`;
        else if (!type) error = `Tipo inválido: "${get("type")}"`;
        else if (!priceRaw) error = "Precio inválido";
        else if (!quantityRaw) error = "Cantidad inválida";
        else if (!dateRaw) error = "Fecha inválida";

        parsed.push({
          rowIndex: i,
          symbol,
          type: type ?? "buy",
          priceUsd: priceRaw ?? "0",
          quantity: quantityRaw ?? "0",
          fee: feeRaw ?? "0",
          date: dateRaw ?? "",
          notes,
          assetId,
          error,
        });
      }

      setRows(parsed);
    };

    reader.readAsArrayBuffer(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  async function handleImport() {
    const validRows = rows.filter((r) => !r.error);
    if (validRows.length === 0) return;

    setImporting(true);
    setImportError(null);

    const payload: ImportRowInput[] = validRows.map((r) => ({
      assetId: r.assetId!,
      type: r.type,
      priceUsd: r.priceUsd,
      quantity: r.quantity,
      fee: r.fee,
      date: r.date,
      notes: r.notes || undefined,
      externalId: makeExternalId(
        r.symbol,
        r.type,
        r.priceUsd,
        r.quantity,
        r.date,
      ),
    }));

    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });

      const json = await res.json();

      if (!res.ok) {
        setImportError(json.error ?? "Error al importar.");
        setImporting(false);
        return;
      }

      setResult(json);
      setTimeout(() => router.push("/transactions"), 1500);
    } catch {
      setImportError("Error de red. Intenta de nuevo.");
      setImporting(false);
    }
  }

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.filter((r) => r.error).length;

  // ---- Render: success state ----
  if (result) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10">
        <CheckCircle2 size={32} className="text-green-400" />
        <p className="text-foreground font-medium">
          {result.inserted} transacción{result.inserted !== 1 ? "es" : ""}{" "}
          importada{result.inserted !== 1 ? "s" : ""}
        </p>
        {result.skipped > 0 && (
          <p className="text-sm text-muted-foreground">
            {result.skipped} duplicadas omitidas
          </p>
        )}
        <p className="text-xs text-muted-foreground">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Drop zone */}
      {rows.length === 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-primary/50",
          )}
        >
          <Upload size={28} className="text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Arrastra tu archivo Excel aquí
          </p>
          <p className="text-xs text-muted-foreground">
            o haz clic para seleccionar · .xlsx / .xls
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Re-upload + file name */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <FileSpreadsheet size={16} className="text-primary" />
            {fileName}
          </div>
          <button
            onClick={() => {
              setRows([]);
              setFileName(null);
              setImportError(null);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cambiar archivo
          </button>
        </div>
      )}

      {/* Template download */}
      <div className="flex items-center gap-2">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download size={12} />
          Descargar plantilla
        </button>
      </div>

      {/* Import error */}
      {importError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={14} />
          {importError}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Summary bar */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-400">{validCount} válidas</span>
            {errorCount > 0 && (
              <span className="text-red-400">{errorCount} con errores</span>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Activo</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-right font-medium">Precio</th>
                  <th className="px-4 py-3 text-right font-medium">Fee</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={cn(
                      "transition-colors",
                      row.error
                        ? "bg-red-500/5 hover:bg-red-500/10"
                        : "bg-background hover:bg-card",
                    )}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.rowIndex}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.symbol || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {!row.error && (
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-xs font-medium",
                            row.type === "buy"
                              ? "bg-green-400/10 text-green-400"
                              : "bg-red-400/10 text-red-400",
                          )}
                        >
                          {row.type === "buy" ? "Compra" : "Venta"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      {!row.error ? formatCrypto(Number(row.quantity)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      {!row.error ? formatUSD(Number(row.priceUsd)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {!row.error && Number(row.fee) > 0
                        ? formatUSD(Number(row.fee))
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.date
                        ? new Date(row.date).toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-400">
                      {row.error ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleImport}
              disabled={validCount === 0 || importing}
              className="flex-1"
            >
              {importing
                ? "Importando..."
                : `Importar ${validCount} transacción${validCount !== 1 ? "es" : ""}`}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={importing}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExcelImport(props: Props) {
  if (props.skeleton) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-48 w-full animate-pulse rounded-xl bg-card" />
        <div className="h-4 w-32 animate-pulse rounded bg-card" />
      </div>
    );
  }
  return <ExcelImportInner assets={props.assets} />;
}
```

---

## 6. Import page

**File:** `app/(dashboard)/transactions/import/page.tsx`

```tsx
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { ExcelImport } from "@/features/transactions/components/ExcelImport";

export default async function ImportTransactionsPage() {
  const assetList = await db.select().from(assets).orderBy(assets.symbol);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Importar transacciones
      </h1>
      <ExcelImport assets={assetList} />
    </div>
  );
}
```

---

## 7. Update transactions page — add Import button

**File:** `app/(dashboard)/transactions/page.tsx`

Add a second button in the header row alongside "Nueva transacción":

```tsx
import { Plus, Upload } from "lucide-react";

// Inside the header div:
<div className="flex items-center gap-2">
  <Link href="/transactions/import">
    <Button size="sm" variant="outline" className="flex items-center gap-2">
      <Upload size={14} />
      Importar Excel
    </Button>
  </Link>
  <Link href="/transactions/new">
    <Button size="sm" className="flex items-center gap-2">
      <Plus size={14} />
      Nueva transacción
    </Button>
  </Link>
</div>;
```

---

## 8. Verification Checklist

- [ ] `/transactions` renders both buttons: "Importar Excel" and "Nueva transacción".
- [ ] `/transactions/import` loads correctly with skeleton during asset fetch.
- [ ] Drag & drop a valid `.xlsx` file → preview table renders.
- [ ] Valid rows shown with green buy/sell badge; invalid rows shown with red background and error message.
- [ ] Summary bar shows correct "X válidas · Y con errores" count.
- [ ] "Importar N transacciones" button is disabled when all rows have errors.
- [ ] Clicking "Descargar plantilla" generates a valid `.xlsx` template file.
- [ ] Confirmed import POSTs to `/api/transactions/import` and redirects to `/transactions`.
- [ ] Re-importing the same file does not create duplicates (skipped count > 0 on second import).
- [ ] Uploading a non-Excel file shows an error message.
- [ ] Uploading an empty file shows an error message.
- [ ] Rows with unknown symbols show "Symbol X no encontrado en el catálogo".
- [ ] Transactions imported via Excel appear in the table with no source badge distinction in the UI.
- [ ] "Cambiar archivo" clears the preview and allows uploading a new file.
