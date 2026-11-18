import { lazy, type ReactNode, Suspense, useId, useState } from "react";
import { cn } from "cn";
import { ChevronDown } from "lucide-react";
import type { AnalysisResult, AnalysisRow } from "@/types/analysis";
import type { AnalysisChartHandle } from "./AnalysisChart";
import { AnalysisExport } from "./AnalysisExport";
import { getAnalysisLabels } from "./analysisLabels";

const AnalysisChart = lazy(() => import("./AnalysisChart"));

const durationFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  style: "unit",
  unit: "millisecond",
});

export function AnalysisOutput({
  title,
  result,
  actions,
  datasetName,
  compact = false,
}: {
  title: string;
  result: AnalysisResult;
  actions?: ReactNode;
  datasetName?: string;
  compact?: boolean;
}) {
  const titleId = useId();
  const [chart, setChart] = useState<AnalysisChartHandle | null>(null);
  const { plan, rows, queryDurationMs, sql, parameters } = result;
  const { groupBy, metric, filters } = plan;
  const { groupLabel, metricLabel } = getAnalysisLabels(plan);

  const hasChartValues = rows.some(
    ({ value }) => value !== null && Number.isFinite(Number(value)),
  );

  return (
    <section
      aria-labelledby={titleId}
      className="@container grid min-w-0 gap-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-1">
          <h2
            id={titleId}
            className="wrap-break-word text-lg font-semibold tracking-tight"
          >
            {title}
          </h2>
          <p
            role="status"
            className="text-sm text-muted-foreground tabular-nums"
          >
            {datasetName && (
              <span className="wrap-break-word">
                {datasetName}
                {" · "}
              </span>
            )}
            {rows.length.toLocaleString()}{" "}
            {rows.length === 1 ? "group" : "groups"}
            {" · "}Query round trip {durationFormat.format(queryDurationMs)}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {actions}
          <AnalysisExport
            title={title}
            result={result}
            exportPng={
              chart && hasChartValues
                ? () => chart.exportPng(title, metricLabel)
                : null
            }
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          This analysis returned no groups.
        </p>
      ) : (
        <div
          className={cn(
            "grid min-w-0 gap-4",
            !compact && "@3xl:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]",
          )}
        >
          <div
            className={cn(
              "min-w-0",
              !compact && "rounded-xl border bg-card p-2",
            )}
          >
            {hasChartValues ? (
              <Suspense
                fallback={
                  <p
                    role="status"
                    className="p-3 text-sm text-muted-foreground"
                  >
                    Loading chart…
                  </p>
                }
              >
                <AnalysisChart
                  ref={setChart}
                  title={title}
                  type={plan.chart}
                  metric={metricLabel}
                  rows={rows}
                />
              </Suspense>
            ) : (
              <p className="p-3 text-sm text-muted-foreground">
                These results contain no values that can be plotted.
              </p>
            )}
          </div>
          {compact ? (
            <details className="group border-t">
              <summary className="flex list-none items-center justify-between gap-2 py-2 text-sm font-medium focus-visible:outline-2">
                Query results
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 group-open:rotate-180"
                />
              </summary>
              <AnalysisResultTable
                title={title}
                groupLabel={groupLabel}
                metricLabel={metricLabel}
                rows={rows}
              />
            </details>
          ) : (
            <AnalysisResultTable
              title={title}
              groupLabel={groupLabel}
              metricLabel={metricLabel}
              rows={rows}
            />
          )}
        </div>
      )}

      <details
        className={cn("group", compact ? "border-t" : "rounded-xl border")}
      >
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium focus-visible:outline-2",
            compact ? "py-2" : "rounded-xl px-4 py-3",
          )}
        >
          How this was calculated
          <ChevronDown
            aria-hidden="true"
            className="size-4 group-open:rotate-180"
          />
        </summary>
        <div
          className={cn(
            "grid gap-4 text-sm",
            compact ? "pt-2" : "border-t p-4",
          )}
        >
          <dl className="grid gap-2">
            <div>
              <dt className="font-medium">Group by</dt>
              <dd className="wrap-break-word text-muted-foreground">
                {groupBy.column}
                {groupBy.bucket === "month" && " by calendar month"}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Aggregation</dt>
              <dd className="wrap-break-word text-muted-foreground">
                {metric.aggregation === "count"
                  ? "Count rows"
                  : `${metric.aggregation === "sum" ? "Sum" : "Average"} of ${metric.column}`}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Filters</dt>
              <dd className="wrap-break-word text-muted-foreground">
                <p>Rows with a missing group value are excluded.</p>
                {filters.map(({ column, equals }, index) => (
                  <p key={index}>
                    {column} equals {JSON.stringify(equals)}
                  </p>
                ))}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Sort and limit</dt>
              <dd className="text-muted-foreground">
                By {plan.sort.by === "group" ? groupLabel : metricLabel},{" "}
                {plan.sort.direction === "asc" ? "ascending" : "descending"}. Up
                to {plan.limit} groups.
              </dd>
            </div>
          </dl>
          <div className="grid min-w-0 gap-2">
            <h3 className="font-medium">Generated SQL</h3>
            <pre
              className="overflow-auto rounded-lg bg-muted p-3 text-xs"
              tabIndex={0}
            >
              <code>{sql}</code>
            </pre>
            <p className="wrap-break-word text-muted-foreground">
              Bound parameters{" "}
              <code className="text-foreground">
                {JSON.stringify(parameters)}
              </code>
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}

function AnalysisResultTable({
  title,
  groupLabel,
  metricLabel,
  rows,
}: {
  title: string;
  groupLabel: string;
  metricLabel: string;
  rows: AnalysisRow[];
}) {
  return (
    <div
      role="region"
      aria-label="Query results"
      tabIndex={0}
      className="max-h-76 min-w-0 overflow-auto rounded-xl border focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <caption className="sr-only">{title} query results</caption>
        <thead className="sticky top-0 bg-muted">
          <tr>
            <th scope="col" className="border-b px-3 py-2 font-medium">
              {groupLabel}
            </th>
            <th
              scope="col"
              className="border-b px-3 py-2 text-right font-medium"
            >
              {metricLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ group, value }) => (
            <tr key={group} className="[&:not(:last-child)>*]:border-b">
              <th scope="row" className="wrap-break-word px-3 py-2 font-normal">
                {group}
              </th>
              <td className="wrap-break-word px-3 py-2 text-right tabular-nums">
                {value ?? <span className="text-muted-foreground">NULL</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
