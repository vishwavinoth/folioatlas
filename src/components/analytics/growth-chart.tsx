"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { GrowthSeries } from "@/lib/api-types";
import { useApi } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";

const RANGES = [
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "1y", label: "1 year" },
  { key: "all", label: "All time" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function formatBucketDate(iso: string, range: RangeKey): string {
  const d = new Date(iso);
  if (range === "30d" || range === "90d") {
    return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
  }
  if (range === "1y") {
    return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

type TooltipPayloadEntry = { payload?: { date: string; total: number; added: number } };

function GrowthTooltip({ active, payload, range }: { active?: boolean; payload?: TooltipPayloadEntry[]; range: RangeKey }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="font-medium">{formatBucketDate(p.date, range)}</p>
      <p className="mt-0.5 text-[var(--fa-text-secondary)]">
        Cumulative: <span className="font-medium text-foreground">{p.total.toLocaleString("en-US")}</span> portfolios
      </p>
      <p className="text-[var(--fa-text-secondary)]">
        Added in period: <span className="font-medium text-[var(--fa-accent)]">+{p.added.toLocaleString("en-US")}</span>
      </p>
    </div>
  );
}

/**
 * Portfolio Growth (PRD §2) — cumulative, verified portfolio counts.
 *
 * Data integrity: the series is built exclusively from PortfolioCountSnapshot
 * rows (upstream git-history commits + our own sync runs). The chart states
 * the verified coverage window and never fabricates history.
 */
export function GrowthChart({ initialRange = "1y" }: { initialRange?: RangeKey }) {
  const [range, setRange] = useState<RangeKey>(initialRange);
  const { data, loading, error } = useApi<GrowthSeries>(`/api/growth?range=${range}`);

  const chartData = useMemo(
    () =>
      (data?.points ?? []).map((p) => ({
        date: p.date,
        label: formatBucketDate(p.date, range),
        total: p.total,
        added: p.added,
      })),
    [data, range]
  );

  const coverage = useMemo(() => {
    if (!data?.coverageFrom || !data?.coverageTo) return null;
    const from = new Date(data.coverageFrom).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
    const to = new Date(data.coverageTo).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
    return { from, to };
  }, [data]);

  const growthSummary = useMemo(() => {
    if (!data || data.points.length < 2) return null;
    const first = data.points[0];
    const last = data.points[data.points.length - 1];
    return {
      total: last.total,
      delta: last.total - first.total,
      fromLabel: formatBucketDate(first.date, range),
      toLabel: formatBucketDate(last.date, range),
    };
  }, [data, range]);

  return (
    <figure
      className="surface-card rounded-2xl p-4 sm:p-5"
      aria-label={
        growthSummary
          ? `Portfolio growth chart: ${growthSummary.total.toLocaleString("en-US")} portfolios as of ${growthSummary.toLabel}, up ${growthSummary.delta.toLocaleString("en-US")} since ${growthSummary.fromLabel}.`
          : "Portfolio growth chart"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <figcaption className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
            <TrendingUp className="h-4 w-4 text-[var(--fa-accent)]" aria-hidden="true" />
            Portfolio Growth
          </h3>
          <p className="mt-0.5 text-xs text-[var(--fa-text-secondary)]">
            {growthSummary
              ? `${growthSummary.total.toLocaleString("en-US")} indexed · +${growthSummary.delta.toLocaleString("en-US")} over the ${RANGES.find((r) => r.key === range)?.label.toLowerCase()} window`
              : "Cumulative count of indexed portfolios over time"}
          </p>
        </figcaption>
        <div role="tablist" aria-label="Growth chart time range" className="flex rounded-full border border-[var(--surface-border)] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                range === r.key
                  ? "bg-[var(--fa-accent)] text-white"
                  : "text-[var(--fa-text-secondary)] hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-52 w-full sm:h-60">
        {loading ? (
          <Skeleton className="h-full w-full rounded-xl" aria-label="Loading growth chart" />
        ) : error ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[var(--surface-border)] text-sm text-[var(--fa-text-secondary)]">
            Growth data is temporarily unavailable — please try again.
          </div>
        ) : chartData.length < 2 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--surface-border)] px-6 text-center">
            <p className="text-sm font-medium">Verified history is still accumulating</p>
            <p className="max-w-md text-xs leading-relaxed text-[var(--fa-text-secondary)]">
              {data && data.points.length === 1
                ? `The first verified snapshot is from ${new Date(data.points[0].date).toLocaleDateString("en-US", { timeZone: "UTC" })}. Each successful sync records a new snapshot, and the chart grows from real data only.`
                : "No verified snapshots exist for this range yet. Pick a wider range — the chart only shows history that can be proven."}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--fa-accent)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--fa-accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--fa-text-secondary)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--surface-border)" }}
                minTickGap={28}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--fa-text-secondary)" }}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={["dataMin - 20", "dataMax + 20"]}
                tickFormatter={(v: number) => v.toLocaleString("en-US")}
              />
              <Tooltip content={<GrowthTooltip range={range} />} cursor={{ stroke: "var(--fa-accent)", strokeOpacity: 0.3 }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--fa-accent)"
                strokeWidth={2}
                fill="url(#growthFill)"
                isAnimationActive={false}
                aria-label="Cumulative portfolio count"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {coverage && chartData.length >= 2 && (
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--fa-text-secondary)]">
          Verified history: {coverage.from} → {coverage.to} · {data?.totalSnapshotsInRange.toLocaleString("en-US")} snapshots ·
          derived from upstream repository commits and recorded syncs — no interpolation.
        </p>
      )}
    </figure>
  );
}
