"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TransactionFilters } from "../types";

type ExportOption = "csv-filtered" | "json-filtered" | "csv-all" | "json-all";

type Props = {
  filters: TransactionFilters;
};

function getExportUrl(option: ExportOption, filters: TransactionFilters) {
  const [format, scope] = option.split("-") as ["csv" | "json", "filtered" | "all"];
  const params = new URLSearchParams({ format, scope });

  if (scope === "filtered") {
    const entries = {
      assetId: filters.assetId,
      type: filters.type,
      source: filters.source,
      from: filters.from,
      to: filters.to,
      search: filters.search,
      sortBy: filters.sortBy,
    };

    for (const [key, value] of Object.entries(entries)) {
      if (value) params.set(key, value);
    }
  }

  return `/api/transactions/export?${params.toString()}`;
}

export function TransactionExport({ filters }: Props) {
  const [option, setOption] = useState<ExportOption>("csv-filtered");
  const href = useMemo(() => getExportUrl(option, filters), [filters, option]);

  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label="Formato y alcance de la exportación"
        value={option}
        onChange={(event) => setOption(event.target.value as ExportOption)}
        className="h-7 max-w-40 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:max-w-none"
      >
        <option value="csv-filtered">CSV filtrados</option>
        <option value="json-filtered">JSON filtrados</option>
        <option value="csv-all">CSV: todo</option>
        <option value="json-all">JSON: todo</option>
      </select>
      <Button size="sm" variant="outline" render={<a href={href} />}>
        <Download size={14} aria-hidden />
        <span className="hidden sm:inline">Exportar</span>
      </Button>
    </div>
  );
}
