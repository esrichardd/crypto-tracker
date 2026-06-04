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
    return new Date(Date.UTC(date.y, date.m - 1, date.d)).toISOString();
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

// Content-based fingerprint for dedup (not cryptographic, just uniqueness)
function makeExternalId(
  symbol: string,
  type: string,
  price: string,
  qty: string,
  date: string,
): string {
  return `csv|${symbol.toUpperCase()}|${type}|${price}|${qty}|${date.slice(0, 10)}`;
}

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

// ----- Inner component (has data) -----

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

  // Build symbol → assetId lookup (uppercase for case-insensitive match)
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
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: "",
      }) as unknown[][];

      if (raw.length < 2) {
        setRows([]);
        setImportError("El archivo está vacío o no tiene datos.");
        return;
      }

      // Normalise headers to lowercase
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
        else if (!assetId) error = `Symbol "${symbol}" no encontrado`;
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

  // Success state
  if (result) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10">
        <CheckCircle2 size={32} className="text-green-400" />
        <p className="font-medium text-foreground">
          {result.inserted} transacción
          {result.inserted !== 1 ? "es" : ""} importada
          {result.inserted !== 1 ? "s" : ""}
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
      {/* Drop zone — only shown before a file is loaded */}
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

      {/* File name + change */}
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
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Cambiar archivo
          </button>
        </div>
      )}

      {/* Template download */}
      <div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Download size={12} />
          Descargar plantilla
        </button>
      </div>

      {/* Import error banner */}
      {importError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={14} />
          {importError}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Summary */}
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

          {/* Action buttons */}
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
