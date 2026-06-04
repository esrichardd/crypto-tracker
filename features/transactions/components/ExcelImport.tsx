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
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUSD, formatCrypto } from "@/lib/utils/formatters";
import type { Asset } from "@/lib/db/schema";
import type { ImportPreviewRow } from "../types";
import type { ImportRowInput } from "../api/import-schema";

type Props = { skeleton: true } | { skeleton?: false; assets: Asset[] };

// ─── Helpers (unchanged) ──────────────────────────────────────────────────────

function normaliseType(raw: unknown): "buy" | "sell" | null {
  const s = String(raw ?? "").toLowerCase().trim();
  if (s === "buy" || s === "compra") return "buy";
  if (s === "sell" || s === "venta") return "sell";
  return null;
}

function normaliseDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    const date = XLSX.SSF.parse_date_code(raw);
    if (!date) return null;
    return new Date(Date.UTC(date.y, date.m - 1, date.d)).toISOString();
  }
  const parsed = new Date(String(raw));
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normaliseNumber(raw: unknown): string | null {
  const n = Number(raw);
  if (isNaN(n) || n < 0) return null;
  return String(n);
}

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

// ─── Column guide (reused in both layouts) ────────────────────────────────────

const COLUMNS = [
  { name: "symbol", desc: "BTC, ETH…", required: true },
  { name: "type", desc: "buy / sell", required: true },
  { name: "price_usd", desc: "Precio en USD", required: true },
  { name: "quantity", desc: "Cantidad de cripto", required: true },
  { name: "date", desc: "YYYY-MM-DD", required: true },
  { name: "fee", desc: "Comisión USD", required: false },
  { name: "notes", desc: "Texto libre", required: false },
] as const;

// Desktop sidebar
function ColumnGuideSidebar({ onDownload }: { onDownload: () => void }) {
  return (
    <div className="hidden shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-4 md:flex md:w-64">
      <p className="text-[10px] uppercase tracking-wide text-secondary">
        Columnas esperadas
      </p>
      <div className="flex flex-col divide-y divide-border">
        {COLUMNS.map((col) => (
          <div key={col.name} className="flex items-center gap-2 py-2">
            <span className="min-w-[80px] rounded bg-primary/5 px-1.5 py-0.5 font-mono text-[11px] text-primary">
              {col.name}
            </span>
            <span className="flex-1 text-[11px] text-muted-foreground">
              {col.desc}
            </span>
            <span
              className={cn(
                "rounded px-1 py-0.5 text-[9px]",
                col.required
                  ? "bg-success/10 text-success"
                  : "bg-border text-secondary",
              )}
            >
              {col.required ? "req" : "opt"}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={onDownload}
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Download size={12} aria-hidden />
        Descargar plantilla de ejemplo
      </button>
    </div>
  );
}

// Mobile chips (horizontal scroll)
function ColumnGuideChips() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card md:hidden">
      <p className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-wide text-secondary">
        Columnas requeridas — desliza →
      </p>
      <div className="flex gap-2 overflow-x-auto px-3 py-2.5 scrollbar-hide">
        {COLUMNS.map((col) => (
          <div
            key={col.name}
            className="shrink-0 rounded-lg border border-border bg-background px-2.5 py-2"
          >
            <p className="font-mono text-[11px] text-primary">{col.name}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {col.desc}
            </p>
            <span
              className={cn(
                "mt-1.5 inline-block rounded px-1 py-0.5 text-[9px]",
                col.required
                  ? "bg-success/10 text-success"
                  : "bg-border text-secondary",
              )}
            >
              {col.required ? "req" : "opt"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: "buy" | "sell" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
        type === "buy" ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
      )}
    >
      {type === "buy" ? <ArrowUp size={9} aria-hidden /> : <ArrowDown size={9} aria-hidden />}
      {type === "buy" ? "Compra" : "Venta"}
    </span>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────

function ExcelImportInner({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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

      const headers = (raw[0] as string[]).map((h) =>
        String(h).toLowerCase().trim(),
      );
      const parsed: ImportPreviewRow[] = [];

      for (let i = 1; i < raw.length; i++) {
        const rowRaw = raw[i] as unknown[];
        const get = (key: string) => rowRaw[headers.indexOf(key)];

        const symbol = String(get("symbol") ?? "").toUpperCase().trim();
        const type = normaliseType(get("type"));
        const priceRaw = normaliseNumber(get("price_usd"));
        const quantityRaw = normaliseNumber(get("quantity"));
        const feeRaw = normaliseNumber(get("fee") ?? 0);
        const dateRaw = normaliseDate(get("date"));
        const notes = String(get("notes") ?? "").trim();
        const assetId = symbolMap.get(symbol) ?? null;

        let error: string | null = null;
        if (!symbol) error = "Symbol vacío";
        else if (!assetId) error = `"${symbol}" no encontrado`;
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
      externalId: makeExternalId(r.symbol, r.type, r.priceUsd, r.quantity, r.date),
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
      setTimeout(() => router.push("/transactions"), 1800);
    } catch {
      setImportError("Error de red. Intenta de nuevo.");
      setImporting(false);
    }
  }

  function resetFile() {
    setRows([]);
    setFileName(null);
    setImportError(null);
  }

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.filter((r) => r.error).length;
  const totalUSD = rows
    .filter((r) => !r.error)
    .reduce((sum, r) => sum + Number(r.priceUsd) * Number(r.quantity), 0);

  // ── Success ──────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-8 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 size={28} className="text-success" />
        </div>
        <div>
          <p className="text-base font-medium text-foreground">
            {result.inserted} transacción{result.inserted !== 1 ? "es" : ""} importada
            {result.inserted !== 1 ? "s" : ""}
          </p>
          {result.skipped > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {result.skipped} duplicada{result.skipped !== 1 ? "s" : ""} omitida
              {result.skipped !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <p className="text-xs text-secondary">Redirigiendo a transacciones…</p>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {/* Drop zone */}
        <div className="flex flex-1 flex-col gap-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed p-10 transition-colors md:p-14",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40 hover:bg-card-hover",
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-background">
              <FileSpreadsheet size={26} className="text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Arrastra tu archivo aquí
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                o toca para seleccionar desde tu dispositivo
              </p>
            </div>
            <div className="flex gap-2">
              <span className="rounded border border-border px-2 py-0.5 text-[10px] text-secondary">
                .xlsx
              </span>
              <span className="rounded border border-border px-2 py-0.5 text-[10px] text-secondary">
                .xls
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {importError && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              <AlertCircle size={14} aria-hidden />
              {importError}
            </div>
          )}

          {/* Mobile column chips */}
          <ColumnGuideChips />
        </div>

        {/* Desktop sidebar */}
        <ColumnGuideSidebar onDownload={downloadTemplate} />
      </div>
    );
  }

  // ── Preview state ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* File bar */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <FileSpreadsheet size={18} className="shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
          <p className="text-[11px] text-secondary">{rows.length} filas detectadas</p>
        </div>
        <button
          onClick={resetFile}
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={12} aria-hidden />
          Cambiar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-secondary">Válidas</p>
          <p className="mt-1 font-mono text-lg font-medium text-success">
            {validCount}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-secondary">Con error</p>
          <p className={cn("mt-1 font-mono text-lg font-medium", errorCount > 0 ? "text-danger" : "text-muted-foreground")}>
            {errorCount}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-secondary">Total USD</p>
          <p className="mt-1 font-mono text-sm font-medium text-muted-foreground">
            {formatUSD(totalUSD)}
          </p>
        </div>
      </div>

      {/* Import error */}
      {importError && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle size={14} aria-hidden />
          {importError}
        </div>
      )}

      {/* Mobile: cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <div
            key={row.rowIndex}
            className={cn(
              "rounded-xl border p-3",
              row.error
                ? "border-danger/20 bg-danger/5"
                : "border-border bg-card",
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {row.symbol || "—"}
              </span>
              {!row.error && <TypeBadge type={row.type} />}
              {row.date && !row.error && (
                <span className="ml-auto text-[10px] text-secondary">
                  {new Date(row.date).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            {!row.error ? (
              <div className="grid grid-cols-3 gap-1 border-t border-border pt-2 text-center">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-secondary">Precio</p>
                  <p className="mt-0.5 font-mono text-xs text-foreground">
                    {formatUSD(Number(row.priceUsd))}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-secondary">Cantidad</p>
                  <p className="mt-0.5 font-mono text-xs text-foreground">
                    {formatCrypto(Number(row.quantity))}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-secondary">Total</p>
                  <p className={cn(
                    "mt-0.5 font-mono text-xs font-medium",
                    row.type === "buy" ? "text-success" : "text-danger",
                  )}>
                    {formatUSD(Number(row.priceUsd) * Number(row.quantity))}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 border-t border-danger/20 pt-2 text-xs text-danger">
                <AlertCircle size={11} aria-hidden />
                {row.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card/60">
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">#</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">Activo</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">Tipo</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-secondary">Precio</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-secondary">Cantidad</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-secondary">Total</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">Fecha</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                key={row.rowIndex}
                className={cn(
                  "transition-colors",
                  row.error
                    ? "bg-danger/5 hover:bg-danger/10"
                    : "bg-background hover:bg-card",
                )}
              >
                <td className="px-4 py-3 text-secondary">{row.rowIndex}</td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {row.symbol || "—"}
                </td>
                <td className="px-4 py-3">
                  {!row.error && <TypeBadge type={row.type} />}
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground">
                  {!row.error ? formatUSD(Number(row.priceUsd)) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground">
                  {!row.error ? formatCrypto(Number(row.quantity)) : "—"}
                </td>
                <td className={cn(
                  "px-4 py-3 text-right font-mono font-medium",
                  !row.error
                    ? row.type === "buy" ? "text-success" : "text-danger"
                    : "text-secondary",
                )}>
                  {!row.error
                    ? formatUSD(Number(row.priceUsd) * Number(row.quantity))
                    : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {row.date
                    ? new Date(row.date).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {row.error ? (
                    <span className="flex items-center gap-1.5 text-xs text-danger">
                      <AlertCircle size={12} aria-hidden />
                      {row.error}
                    </span>
                  ) : (
                    <CheckCircle2 size={14} className="text-success" aria-hidden />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleImport}
          disabled={validCount === 0 || importing}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Upload size={14} aria-hidden />
          {importing
            ? "Importando…"
            : `Importar ${validCount} transacción${validCount !== 1 ? "es" : ""}`}
        </button>
        <button
          onClick={() => router.back()}
          disabled={importing}
          className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ExcelImportSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="h-56 flex-1 animate-pulse rounded-xl bg-card" />
      <div className="hidden h-56 w-64 animate-pulse rounded-xl bg-card md:block" />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function ExcelImport(props: Props) {
  if (props.skeleton) return <ExcelImportSkeleton />;
  return <ExcelImportInner assets={props.assets} />;
}
