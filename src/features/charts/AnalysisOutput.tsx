import { lazy, Suspense, useId } from "react";
import { ChevronDown } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

const AnalysisChart = lazy(() => import("./AnalysisChart"));

const durationFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  style: "unit",
  unit: "millisecond",
});

export function AnalysisOutput({
  title,
  result,
}: {
  title: string;
  result: AnalysisResult;
}) {
  const titleId = useId();
  const { plan, rows, queryDurationMs, sql, parameters } = result;
  const { groupBy, metric, filters } = plan;
  const groupLabel = groupBy.bucket === "month" ? "Month" : groupBy.column;
  const metricLabel =
    metric.aggregation === "count"
      ? "Row count"
      : `${metric.aggregation === "sum" ? "Total" : "Average"} ${metric.column}`;

  const hasChartValues = rows.some(
    ({ value }) => value !== null && Number.isFinite(Number(value)),
  );

  return (
    <section aria-labelledby={titleId} className="grid min-w-0 gap-4">
      <div className="grid gap-1">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p role="status" className="text-sm text-muted-foreground tabular-nums">
          {rows.length.toLocaleString()}{" "}
          {rows.length === 1 ? "group" : "groups"}
          {" · "}Query round trip {durationFormat.format(queryDurationMs)}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          This analysis returned no groups.
        </p>
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]">
          <div className="min-w-0 rounded-xl border bg-card p-2">
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
                    <th
                      scope="row"
                      className="wrap-break-word px-3 py-2 font-normal"
                    >
                      {group}
                    </th>
                    <td className="wrap-break-word px-3 py-2 text-right tabular-nums">
                      {value ?? (
                        <span className="text-muted-foreground">NULL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <details className="group rounded-xl border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium focus-visible:outline-2">
          How this was calculated
          <ChevronDown
            aria-hidden="true"
            className="size-4 group-open:rotate-180"
          />
        </summary>
        <div className="grid gap-4 border-t p-4 text-sm">
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
