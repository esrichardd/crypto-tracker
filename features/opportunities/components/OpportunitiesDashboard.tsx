"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Filter,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/utils/dates";
import {
  formatCrypto,
  formatPercent,
  formatUSD,
} from "@/lib/utils/formatters";
import type { OpportunitiesData, OpportunityLot } from "../types";

type SortKey = "roi_desc" | "pnl_desc" | "days_desc" | "target_gap_asc";
type VisibilityFilter = "all" | "target" | "green" | "loss";

type EnrichedLot = OpportunityLot & {
  targetPriceUsd: number;
  targetGapPercent: number;
  meetsTarget: boolean;
  isGreen: boolean;
  isPartial: boolean;
};

export function OpportunitiesDashboard({
  data,
  initialTargetRoi,
}: {
  data: OpportunitiesData;
  initialTargetRoi: number;
}) {
  const [targetRoi, setTargetRoi] = useState(initialTargetRoi);
  const [savedTargetRoi, setSavedTargetRoi] = useState(initialTargetRoi);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [targetSaveError, setTargetSaveError] = useState<string | null>(null);
  const [targetSaved, setTargetSaved] = useState(false);
  const [assetId, setAssetId] = useState("all");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("roi_desc");
  const targetIsDirty = targetRoi !== savedTargetRoi;

  function updateTargetRoi(value: number) {
    setTargetRoi(value);
    setTargetSaved(false);
    setTargetSaveError(null);
  }

  async function saveTargetRoi() {
    setIsSavingTarget(true);
    setTargetSaved(false);
    setTargetSaveError(null);

    try {
      const response = await fetch("/api/opportunities/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRoiPercent: targetRoi }),
      });

      if (!response.ok) throw new Error("save_failed");

      const json = (await response.json()) as { targetRoiPercent: number };
      setSavedTargetRoi(json.targetRoiPercent);
      setTargetRoi(json.targetRoiPercent);
      setTargetSaved(true);
    } catch {
      setTargetSaveError("No se pudo guardar el ROI objetivo.");
    } finally {
      setIsSavingTarget(false);
    }
  }

  const assets = useMemo(() => {
    const map = new Map<string, OpportunityLot["asset"]>();
    for (const lot of data.lots) map.set(lot.asset.id, lot.asset);
    return [...map.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [data.lots]);

  const enrichedLots = useMemo<EnrichedLot[]>(
    () =>
      data.lots.map((lot) => {
        const targetPriceUsd = lot.unitCostBasis * (1 + targetRoi / 100);
        const targetGapPercent =
          targetPriceUsd === 0
            ? 0
            : ((targetPriceUsd - lot.currentPriceUsd) / targetPriceUsd) * 100;

        return {
          ...lot,
          targetPriceUsd,
          targetGapPercent,
          meetsTarget: lot.pnlPercent >= targetRoi,
          isGreen: lot.pnlAbsolute > 0,
          isPartial: lot.soldQuantity > 0.00000001,
        };
      }),
    [data.lots, targetRoi],
  );

  const filteredLots = useMemo(() => {
    const lots = enrichedLots
      .filter((lot) => assetId === "all" || lot.asset.id === assetId)
      .filter((lot) => {
        if (visibility === "target") return lot.meetsTarget;
        if (visibility === "green") return lot.isGreen;
        if (visibility === "loss") return !lot.isGreen;
        return true;
      });

    return lots.sort((a, b) => {
      if (sortBy === "pnl_desc") return b.pnlAbsolute - a.pnlAbsolute;
      if (sortBy === "days_desc") return b.daysHeld - a.daysHeld;
      if (sortBy === "target_gap_asc") {
        return Math.max(0, a.targetGapPercent) - Math.max(0, b.targetGapPercent);
      }
      return b.pnlPercent - a.pnlPercent;
    });
  }, [assetId, enrichedLots, sortBy, visibility]);

  const summary = useMemo(() => {
    const activeLots = enrichedLots.length;
    const targetLots = enrichedLots.filter((lot) => lot.meetsTarget);
    const greenLots = enrichedLots.filter((lot) => lot.isGreen);
    const lossLots = enrichedLots.filter((lot) => !lot.isGreen);
    const partialLots = enrichedLots.filter((lot) => lot.isPartial);
    const targetPnl = targetLots.reduce((sum, lot) => sum + lot.pnlAbsolute, 0);

    return {
      activeLots,
      targetLots: targetLots.length,
      greenLots: greenLots.length,
      lossLots: lossLots.length,
      partialLots: partialLots.length,
      targetPnl,
    };
  }, [enrichedLots]);

  if (data.lots.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay compras disponibles para analizar.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra compras y ventas para ver oportunidades por lote.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <SummaryGrid summary={summary} targetRoi={targetRoi} />

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="targetRoi"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              ROI objetivo
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="targetRoi"
                type="number"
                min={0}
                max={1000}
                step={1}
                value={targetRoi}
                onChange={(event) =>
                  updateTargetRoi(Number(event.target.value) || 0)
                }
                className="max-w-28"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <div className="hidden items-center gap-1 md:flex">
                {[10, 20, 30].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={targetRoi === value ? "default" : "outline"}
                    onClick={() => updateTargetRoi(value)}
                  >
                    {value}%
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex min-h-5 items-center gap-2 text-xs">
              {targetSaved && (
                <span className="text-success">ROI objetivo guardado.</span>
              )}
              {targetSaveError && (
                <span className="text-danger">{targetSaveError}</span>
              )}
              {!targetSaved && !targetSaveError && (
                <span className="text-muted-foreground">
                  Se usará luego para alarmas.
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="assetFilter"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              Activo
            </Label>
            <select
              id="assetFilter"
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todos los activos</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.symbol} · {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="sortBy"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              Orden
            </Label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="roi_desc">Mayor ROI</option>
              <option value="pnl_desc">Mayor ganancia</option>
              <option value="days_desc">Más días holding</option>
              <option value="target_gap_asc">Más cerca del objetivo</option>
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            className="self-end"
            onClick={() => {
              updateTargetRoi(savedTargetRoi);
              setAssetId("all");
              setVisibility("all");
              setSortBy("roi_desc");
            }}
          >
            <Filter size={14} />
            Limpiar
          </Button>
        </div>

        <div className="mt-3 flex justify-start">
          <Button
            type="button"
            size="sm"
            disabled={!targetIsDirty || isSavingTarget}
            onClick={saveTargetRoi}
          >
            {isSavingTarget ? "Guardando..." : "Guardar ROI objetivo"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip
            active={visibility === "all"}
            onClick={() => setVisibility("all")}
          >
            Todos
          </FilterChip>
          <FilterChip
            active={visibility === "target"}
            onClick={() => setVisibility("target")}
          >
            Cumplen ROI
          </FilterChip>
          <FilterChip
            active={visibility === "green"}
            onClick={() => setVisibility("green")}
          >
            En verde
          </FilterChip>
          <FilterChip
            active={visibility === "loss"}
            onClick={() => setVisibility("loss")}
          >
            En pérdida
          </FilterChip>
        </div>
      </div>

      <OpportunityTable
        lots={filteredLots}
        targetRoi={targetRoi}
        asOfDate={data.asOfDate}
      />
    </div>
  );
}

function SummaryGrid({
  summary,
  targetRoi,
}: {
  summary: {
    activeLots: number;
    targetLots: number;
    greenLots: number;
    lossLots: number;
    partialLots: number;
    targetPnl: number;
  };
  targetRoi: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        icon={<Target size={15} />}
        label={`ROI ≥ ${targetRoi}%`}
        value={String(summary.targetLots)}
        detail={`${formatUSD(summary.targetPnl)} de ganancia potencial`}
        tone="success"
      />
      <SummaryCard
        icon={<TrendingUp size={15} />}
        label="Compras en verde"
        value={String(summary.greenLots)}
        detail={`${summary.lossLots} en pérdida`}
        tone="primary"
      />
      <SummaryCard
        icon={<Clock3 size={15} />}
        label="Lotes activos"
        value={String(summary.activeLots)}
        detail={`${summary.partialLots} vendidos parcialmente`}
        tone="neutral"
      />
      <SummaryCard
        icon={<CheckCircle2 size={15} />}
        label="Criterio"
        value={`${targetRoi}%`}
        detail="Por transacción, no por total"
        tone="neutral"
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "success" | "primary" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-lg border",
            tone === "success" &&
              "border-success/30 bg-success/10 text-success",
            tone === "primary" &&
              "border-primary/30 bg-primary/10 text-primary",
            tone === "neutral" && "border-border bg-background text-primary",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function OpportunityTable({
  lots,
  targetRoi,
  asOfDate,
}: {
  lots: EnrichedLot[];
  targetRoi: number;
  asOfDate: string;
}) {
  if (lots.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay lotes con esos filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Compras disponibles
          </p>
          <p className="text-xs text-muted-foreground">
            Precio actual al {formatDateOnly(asOfDate)}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {lots.length} {lots.length === 1 ? "lote" : "lotes"}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-border lg:hidden">
        {lots.map((lot) => (
          <OpportunityCard key={lot.id} lot={lot} targetRoi={targetRoi} />
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/70 text-muted-foreground">
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">
                Compra
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                Disponible
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                Costo unit.
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                Precio actual
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                ROI
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                P&L
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                Objetivo
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">
                Días
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lots.map((lot) => (
              <tr key={lot.id} className="bg-card">
                <td className="px-4 py-3">
                  <AssetCell lot={lot} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-foreground">
                  {formatCrypto(lot.remainingQuantity)}
                  {lot.isPartial && (
                    <span className="ml-1 text-muted-foreground">
                      / {formatCrypto(lot.originalQuantity)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                  {formatUSD(lot.unitCostBasis)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-foreground">
                  {formatUSD(lot.currentPriceUsd)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono text-xs font-medium",
                    lot.pnlPercent >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {formatPercent(lot.pnlPercent)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono text-xs font-medium",
                    lot.pnlAbsolute >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {formatUSD(lot.pnlAbsolute)}
                </td>
                <td className="px-4 py-3 text-right">
                  <TargetCell lot={lot} />
                </td>
                <td className="px-4 py-3 text-right">
                  <HoldingCell lot={lot} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadges lot={lot} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OpportunityCard({
  lot,
  targetRoi,
}: {
  lot: EnrichedLot;
  targetRoi: number;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <AssetCell lot={lot} />
        <StatusBadges lot={lot} compact />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="ROI" value={formatPercent(lot.pnlPercent)} positive={lot.pnlPercent >= 0} />
        <Metric label="P&L" value={formatUSD(lot.pnlAbsolute)} positive={lot.pnlAbsolute >= 0} />
        <Metric label="Disponible" value={formatCrypto(lot.remainingQuantity)} />
        <Metric label={`Objetivo ${targetRoi}%`} value={formatUSD(lot.targetPriceUsd)} />
        <Metric label="Precio actual" value={formatUSD(lot.currentPriceUsd)} />
        <Metric label="Días holding" value={`${lot.daysHeld} días`} />
      </div>
    </div>
  );
}

function AssetCell({ lot }: { lot: EnrichedLot }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {lot.asset.logoUrl ? (
        <Image
          src={lot.asset.logoUrl}
          alt={lot.asset.symbol}
          width={28}
          height={28}
          className="rounded-full"
        />
      ) : (
        <div className="flex size-7 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-muted-foreground">
          {lot.asset.symbol.slice(0, 2)}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{lot.asset.symbol}</p>
          <span className="text-xs text-muted-foreground">
            {formatDateOnly(lot.buyDate)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {lot.asset.name}
        </p>
      </div>
    </div>
  );
}

function TargetCell({ lot }: { lot: EnrichedLot }) {
  if (lot.meetsTarget) {
    return (
      <div className="flex flex-col items-end">
        <span className="font-mono text-xs font-medium text-success">
          {formatUSD(lot.targetPriceUsd)}
        </span>
        <span className="text-[11px] text-success">cumple</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <span className="font-mono text-xs text-muted-foreground">
        {formatUSD(lot.targetPriceUsd)}
      </span>
      <span className="text-[11px] text-muted-foreground">
        falta {Math.max(0, lot.targetGapPercent).toFixed(2)}%
      </span>
    </div>
  );
}

function HoldingCell({ lot }: { lot: EnrichedLot }) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-mono text-xs text-foreground">
        {lot.daysHeld} días
      </span>
      <span className="text-[11px] text-muted-foreground">
        anual {formatOptionalPercent(lot.annualizedPnlPercent)}
      </span>
    </div>
  );
}

function StatusBadges({
  lot,
  compact = false,
}: {
  lot: EnrichedLot;
  compact?: boolean;
}) {
  const badges = [
    lot.meetsTarget ? "Cumple ROI" : lot.isGreen ? "En verde" : "En pérdida",
    lot.isPartial ? "Parcial" : null,
  ].filter(Boolean);

  return (
    <div className={cn("flex flex-wrap gap-1.5", compact && "justify-end")}>
      {badges.map((badge) => (
        <span
          key={badge}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
            badge === "Cumple ROI" &&
              "border-success/30 bg-success/10 text-success",
            badge === "En verde" &&
              "border-primary/30 bg-primary/10 text-primary",
            badge === "En pérdida" &&
              "border-danger/30 bg-danger/10 text-danger",
            badge === "Parcial" &&
              "border-border bg-background text-muted-foreground",
          )}
        >
          {badge !== "Parcial" &&
            (badge === "En pérdida" ? (
              <ArrowDown size={10} />
            ) : (
              <ArrowUp size={10} />
            ))}
          {badge}
        </span>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-xs font-medium text-foreground",
          positive === true && "text-success",
          positive === false && "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatOptionalPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  if (Math.abs(value) > 9999) return ">9999%";
  return formatPercent(value);
}
