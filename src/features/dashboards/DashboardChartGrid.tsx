import { useEffect, useEffectEvent, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "cn";
import { ChartNoAxesCombined } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { AnalysisOutput } from "@/features/charts/AnalysisOutput";
import { WorkspaceEmptyState } from "@/features/workspace/WorkspaceEmptyState";
import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";
import { workspaceDb } from "@/lib/workspaceDb";
import type { DashboardChart } from "@/types/dashboard";
import type { Dataset } from "@/types/dataset";
import { DashboardNameDialog } from "./DashboardNameDialog";
import {
  loadDashboardCharts,
  type DashboardChartResult,
} from "./loadDashboardCharts";

export function DashboardChartGrid({
  dashboardId,
  focusedChartId,
  engine,
  activeDataset,
  waitingForWorkspace,
}: {
  dashboardId: string;
  focusedChartId: string | null;
  engine: DuckDBEngine;
  activeDataset: Dataset | null;
  waitingForWorkspace: boolean;
}) {
  const charts = useLiveQuery(
    () =>
      workspaceDb.dashboardCharts
        .where("dashboardId")
        .equals(dashboardId)
        .sortBy("createdAt")
        .catch(() => null),
    [dashboardId],
  );
  const [results, setResults] = useState<Record<string, DashboardChartResult>>(
    {},
  );
  const [retryCount, setRetryCount] = useState(0);

  // Titles can change without running the same chart again
  const chartIds = charts?.map(({ id }) => id).join(",");
  const loadCharts = useEffectEvent((signal: AbortSignal) => {
    if (!charts) return;
    const pending = charts.filter(({ id }) => !results[id]);
    void loadDashboardCharts(
      engine,
      pending,
      activeDataset,
      signal,
      (id, state) => {
        setResults((current) => ({ ...current, [id]: state }));
      },
    );
  });

  useEffect(() => {
    if (!chartIds || waitingForWorkspace) return;
    const controller = new AbortController();
    loadCharts(controller.signal);
    return () => controller.abort();
  }, [chartIds, engine, activeDataset, waitingForWorkspace, retryCount]);

  const chartToFocus = charts?.find(({ id }) => id === focusedChartId)?.id;
  useEffect(() => {
    if (chartToFocus) document.getElementById(`chart-${chartToFocus}`)?.focus();
  }, [chartToFocus]);

  if (charts === undefined) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading pinned charts…
      </p>
    );
  }

  if (charts === null) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not read pinned charts. Reload to try again.
      </p>
    );
  }

  if (charts.length === 0) {
    return (
      <WorkspaceEmptyState
        icon={ChartNoAxesCombined}
        title="No charts pinned"
        description="Open Chart Studio and use Pin to dashboard on any analysis result."
      >
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="../charts" />}
        >
          Open Chart Studio
        </Button>
      </WorkspaceEmptyState>
    );
  }

  const hasErrors = charts.some(
    ({ id }) => results[id] && "error" in results[id],
  );
  const [first, second] = charts;
  const hasTrendAndBar =
    charts.length === 2 && first.plan.chart !== second.plan.chart;
  const orderedCharts =
    hasTrendAndBar && first.plan.chart === "bar" ? [second, first] : charts;

  function retryCharts() {
    setResults((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([, state]) => "result" in state),
      ),
    );
    setRetryCount((count) => count + 1);
  }

  return (
    <section
      aria-label="Pinned charts"
      className="@container grid min-w-0 gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {charts.length} pinned {charts.length === 1 ? "chart" : "charts"}
        </p>
        {hasErrors && (
          <Button variant="outline" onClick={retryCharts}>
            Retry charts
          </Button>
        )}
      </div>
      <div
        className={cn(
          "grid min-w-0 items-start gap-4",
          hasTrendAndBar
            ? "@4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
            : "@4xl:grid-cols-2",
        )}
      >
        {orderedCharts.map((chart) => (
          <article
            key={chart.id}
            id={`chart-${chart.id}`}
            tabIndex={focusedChartId === chart.id ? -1 : undefined}
            className="grid min-w-0 gap-4 rounded-xl border border-panel-border bg-card p-4 text-card-foreground focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-5"
          >
            <PinnedChart
              chart={chart}
              state={results[chart.id]}
              onRemove={async () => {
                await workspaceDb.dashboardCharts.delete(chart.id);
                setResults((current) => {
                  const next = { ...current };
                  delete next[chart.id];
                  return next;
                });
              }}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function PinnedChart({
  chart,
  state,
  onRemove,
}: {
  chart: DashboardChart;
  state?: DashboardChartResult;
  onRemove: () => Promise<void>;
}) {
  const actions = (
    <>
      <DashboardNameDialog
        action="Edit title"
        label="Chart title"
        initialName={chart.title}
        onSave={async (title) => {
          const updated = await workspaceDb.dashboardCharts.update(chart.id, {
            title,
          });
          if (!updated) throw new Error("This chart is no longer pinned.");
        }}
      />
      <ConfirmAction
        action="Remove chart"
        ariaLabel={`Remove ${chart.title} from this dashboard`}
        title="Remove pinned chart?"
        description={`Remove “${chart.title}” from this dashboard.`}
        disabled={false}
        onConfirm={onRemove}
      />
    </>
  );

  if (state && "result" in state) {
    return (
      <AnalysisOutput
        title={chart.title}
        result={state.result}
        datasetName={state.datasetName}
        actions={actions}
        compact
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 wrap-break-word text-base font-medium tracking-tight">
          {chart.title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {state ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          Loading chart…
        </p>
      )}
    </>
  );
}
