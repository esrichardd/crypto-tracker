import { NextRequest, NextResponse } from "next/server";
import { getTransactionsForExport } from "@/features/transactions/api/get-transactions-for-export";
import { requireSession } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-error";
import type { TransactionFilters } from "@/features/transactions/types";

const VALID_TYPES = ["buy", "sell"] as const;
const VALID_SOURCES = ["manual", "binance", "csv"] as const;
const VALID_SORTS = [
  "fecha_desc",
  "fecha_asc",
  "total_desc",
  "total_asc",
] as const;

function isOneOf<T extends readonly string[]>(
  value: string | null,
  values: T,
): value is T[number] {
  return value !== null && (values as readonly string[]).includes(value);
}

function getFilteredParams(searchParams: URLSearchParams): TransactionFilters {
  const type = searchParams.get("type");
  const source = searchParams.get("source");
  const sortBy = searchParams.get("sortBy");

  return {
    assetId: searchParams.get("assetId") ?? undefined,
    type: isOneOf(type, VALID_TYPES) ? type : undefined,
    source: isOneOf(source, VALID_SOURCES) ? source : undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    sortBy: isOneOf(sortBy, VALID_SORTS) ? sortBy : undefined,
  };
}

function csvCell(value: string | number | null): string {
  const text = String(value ?? "");
  // Avoid spreadsheet formula injection when the CSV is opened in Excel.
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = request.nextUrl;
    const format = searchParams.get("format");
    const scope = searchParams.get("scope") ?? "filtered";

    if (format !== "csv" && format !== "json") {
      return NextResponse.json(
        { error: "El formato debe ser csv o json." },
        { status: 400 },
      );
    }

    if (scope !== "all" && scope !== "filtered") {
      return NextResponse.json(
        { error: "El alcance debe ser all o filtered." },
        { status: 400 },
      );
    }

    const rows = await getTransactionsForExport(
      session.user.id,
      scope === "filtered" ? getFilteredParams(searchParams) : {},
    );
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `movimientos-${scope === "all" ? "todos" : "filtrados"}-${stamp}`;

    if (format === "json") {
      const body = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          count: rows.length,
          transactions: rows,
        },
        null,
        2,
      );

      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const header = [
      "id",
      "activo",
      "nombre_activo",
      "tipo",
      "precio_usd",
      "cantidad",
      "comision_usd",
      "total_usd",
      "fecha",
      "fuente",
      "notas",
      "creado_en",
    ];
    const lines = rows.map((row) =>
      [
        row.id,
        row.asset.symbol,
        row.asset.name,
        row.type,
        row.priceUsd,
        row.quantity,
        row.fee,
        row.totalUsd,
        row.date,
        row.source,
        row.notes,
        row.createdAt.toISOString(),
      ]
        .map(csvCell)
        .join(","),
    );
    // BOM keeps accented Spanish headers readable when opening the file in Excel.
    const body = `\uFEFF${header.map(csvCell).join(",")}\r\n${lines.join("\r\n")}`;

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
