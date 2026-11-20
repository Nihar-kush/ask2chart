import { type FormEvent, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/SelectField";
import type { AnalysisPlan, CompiledAnalysis } from "@/types/analysis";
import type { DatasetColumn } from "@/types/dataset";
import { getAnalysisLabels } from "./analysisLabels";
import { maxAnalysisFilters } from "./analysisPlanSchema";
import {
  analysisFilterKind,
  compileAnalysisPlan,
  isDateColumn,
  isNumericColumn,
} from "./compileAnalysisPlan";

const fieldClass =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-hidden focus-visible:border-ring disabled:opacity-60";

const chartOrders = [
  { label: "Highest value first", by: "metric", direction: "desc" },
  { label: "Lowest value first", by: "metric", direction: "asc" },
  { label: "Group ascending", by: "group", direction: "asc" },
  { label: "Group descending", by: "group", direction: "desc" },
] as const;

type FilterDraft = { key: number; column: string; value: string };
type ChartDraft = Omit<AnalysisPlan, "filters" | "limit"> & {
  title: string;
  limit: string;
  filters: FilterDraft[];
};

export function ManualChartForm({
  columns,
  initial,
  busy,
  onBuild,
}: {
  columns: DatasetColumn[];
  initial?: { title: string; plan: AnalysisPlan };
  busy: boolean;
  onBuild: (title: string, analysis: CompiledAnalysis) => void;
}) {
  const numericColumns = columns.filter(({ type }) => isNumericColumn(type));
  const dateColumns = columns.filter(({ type }) => isDateColumn(type));
  const filterColumns = columns.filter(({ type }) => analysisFilterKind(type));
  const [draft, setDraft] = useState<ChartDraft>(() => ({
    chart: initial?.plan.chart ?? "bar",
    title: initial?.title ?? "",
    groupBy: initial?.plan.groupBy ?? {
      column:
        (columns.find(({ type }) => type === "VARCHAR") ?? columns[0])?.name ??
        "",
      bucket: "value",
    },
    metric: initial?.plan.metric ?? { aggregation: "count" },
    sort: initial?.plan.sort ?? { by: "metric", direction: "desc" },
    limit: String(initial?.plan.limit ?? 20),
    filters:
      initial?.plan.filters.map((filter, key) => ({
        key,
        column: filter.column,
        value: String(filter.equals),
      })) ?? [],
  }));
  const [error, setError] = useState<string | null>(null);
  const limitId = useId();
  const optionsRef = useRef<HTMLDetailsElement>(null);

  const line = draft.chart === "line";
  const groupColumns = line ? dateColumns : columns;
  const canGroupByMonth = dateColumns.some(
    ({ name }) => name === draft.groupBy.column,
  );
  const orderIndex = chartOrders.findIndex(
    ({ by, direction }) =>
      by === draft.sort.by && direction === draft.sort.direction,
  );

  function changeDraft(changes: Partial<ChartDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setError(null);
  }

  function changeChart(chart: AnalysisPlan["chart"]) {
    if (chart === "bar") {
      changeDraft({ chart });
      return;
    }
    const group =
      dateColumns.find(({ name }) => name === draft.groupBy.column) ??
      dateColumns[0];
    if (!group) return;
    changeDraft({ chart, groupBy: { column: group.name, bucket: "month" } });
  }

  function changeAggregation(
    aggregation: AnalysisPlan["metric"]["aggregation"],
  ) {
    if (aggregation === "count") {
      changeDraft({ metric: { aggregation } });
      return;
    }
    const column =
      draft.metric.aggregation === "count"
        ? numericColumns[0]?.name
        : draft.metric.column;
    if (column) changeDraft({ metric: { aggregation, column } });
  }

  function changeFilter(key: number, changes: Partial<FilterDraft>) {
    changeDraft({
      filters: draft.filters.map((filter) =>
        filter.key === key ? { ...filter, ...changes } : filter,
      ),
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    try {
      const filters = draft.filters.map(({ column, value }) => {
        const type = filterColumns.find(({ name }) => name === column)?.type;
        const kind = analysisFilterKind(type ?? "");
        if (kind === "boolean") return { column, equals: value === "true" };
        const equals =
          kind === "integer" || kind === "number" ? Number(value) : value;
        return { column, equals };
      });
      const plan: AnalysisPlan = {
        chart: draft.chart,
        groupBy: draft.groupBy,
        metric: draft.metric,
        sort: line ? { by: "group", direction: "asc" } : draft.sort,
        limit: Number(draft.limit),
        filters,
      };
      const compiled = compileAnalysisPlan(plan, columns);
      const { groupLabel, metricLabel } = getAnalysisLabels(compiled.plan);
      const title =
        draft.title.trim() || `${metricLabel} by ${groupLabel}`.slice(0, 100);
      onBuild(title, compiled);
      setError(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Check your chart settings and try again.",
      );
    }
  }

  if (columns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This dataset has no columns to chart.
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      onInvalidCapture={() => {
        if (optionsRef.current) optionsRef.current.open = true;
      }}
    >
      <fieldset disabled={busy} className="grid min-w-0 gap-4">
        <legend className="sr-only">Chart settings</legend>
        <div className="grid min-w-0 gap-x-4 gap-y-3 @sm:grid-cols-2">
          <SelectField<AnalysisPlan["chart"]>
            label="Chart type"
            value={draft.chart}
            disabled={busy}
            onChange={changeChart}
            options={[
              { value: "bar", label: "Bar" },
              {
                value: "line",
                label: dateColumns.length
                  ? "Line by month"
                  : "Line by month (needs a date column)",
                disabled: !dateColumns.length,
              },
            ]}
          />
          <SelectField
            label="Group by"
            description={
              line
                ? "Dates are combined into calendar months."
                : "Rows with the same value are combined into one bar."
            }
            value={draft.groupBy.column}
            disabled={busy}
            options={groupColumns.map(({ name }) => ({
              value: name,
              label: name,
            }))}
            onChange={(column) => {
              const isDate = dateColumns.some(({ name }) => name === column);
              changeDraft({
                groupBy: {
                  column,
                  bucket: isDate ? draft.groupBy.bucket : "value",
                },
              });
            }}
          />
          {canGroupByMonth && !line && (
            <SelectField<AnalysisPlan["groupBy"]["bucket"]>
              label="Date grouping"
              value={draft.groupBy.bucket}
              disabled={busy}
              options={[
                { value: "value", label: "Exact values" },
                { value: "month", label: "Calendar month" },
              ]}
              onChange={(bucket) =>
                changeDraft({ groupBy: { ...draft.groupBy, bucket } })
              }
            />
          )}
          <SelectField<AnalysisPlan["metric"]["aggregation"]>
            label="Calculation"
            value={draft.metric.aggregation}
            disabled={busy}
            onChange={changeAggregation}
            options={[
              { value: "count", label: "Count rows" },
              { value: "sum", label: "Sum", disabled: !numericColumns.length },
              {
                value: "avg",
                label: "Average",
                disabled: !numericColumns.length,
              },
            ]}
          />
          {draft.metric.aggregation !== "count" && (
            <SelectField
              label="Value column"
              value={draft.metric.column}
              disabled={busy}
              options={numericColumns.map(({ name }) => ({
                value: name,
                label: name,
              }))}
              onChange={(column) => {
                if (draft.metric.aggregation !== "count") {
                  changeDraft({ metric: { ...draft.metric, column } });
                }
              }}
            />
          )}
        </div>

        <details
          ref={optionsRef}
          open={Boolean(initial)}
          className="group border-t pt-2"
        >
          <summary className="-mx-2 flex min-h-10 list-none items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm font-medium hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
            Title, sorting and filters
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground group-open:rotate-180"
            />
          </summary>
          <div className="grid gap-4 pt-3">
            <label className="grid min-w-0 gap-1.5 text-sm font-medium">
              Chart title
              <input
                className={fieldClass}
                placeholder="Optional"
                maxLength={100}
                value={draft.title}
                onChange={(event) =>
                  changeDraft({ title: event.currentTarget.value })
                }
              />
            </label>
            <div className="grid min-w-0 gap-x-4 gap-y-3 @sm:grid-cols-2">
              <SelectField
                label="Sort by"
                value={line ? "2" : String(orderIndex)}
                disabled={busy || line}
                options={chartOrders.map(({ label }, index) => ({
                  value: String(index),
                  label: line && index === 2 ? "Oldest month first" : label,
                }))}
                onChange={(value) => {
                  const order = chartOrders[Number(value)];
                  if (order)
                    changeDraft({
                      sort: { by: order.by, direction: order.direction },
                    });
                }}
              />
              <div className="grid min-w-0 content-start gap-1.5">
                <label htmlFor={limitId} className="text-sm font-medium">
                  Result limit
                </label>
                <input
                  id={limitId}
                  aria-describedby={`${limitId}-help`}
                  className={fieldClass}
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={draft.limit}
                  onChange={(event) =>
                    changeDraft({ limit: event.currentTarget.value })
                  }
                />
                <p
                  id={`${limitId}-help`}
                  className="text-xs text-muted-foreground"
                >
                  {line
                    ? "Maximum months shown, starting with the earliest."
                    : "Maximum bars shown after sorting."}
                </p>
              </div>
            </div>

            {filterColumns.length > 0 && (
              <div className="grid min-w-0 gap-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Filters</p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={draft.filters.length >= maxAnalysisFilters}
                    onClick={() => {
                      const column = filterColumns[0];
                      changeDraft({
                        filters: [
                          ...draft.filters,
                          {
                            key: (draft.filters.at(-1)?.key ?? -1) + 1,
                            column: column.name,
                            value:
                              analysisFilterKind(column.type) === "boolean"
                                ? "true"
                                : "",
                          },
                        ],
                      });
                    }}
                  >
                    Add filter
                  </Button>
                </div>
                {draft.filters.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Rows must match every filter.
                  </p>
                )}
                {draft.filters.map((filter, index) => {
                  const columnType =
                    filterColumns.find(({ name }) => name === filter.column)
                      ?.type ?? "";
                  const kind = analysisFilterKind(columnType);
                  const isNumber = kind === "integer" || kind === "number";
                  const suffix = (
                    <span className="sr-only"> for filter {index + 1}</span>
                  );

                  return (
                    <div
                      key={filter.key}
                      className="grid min-w-0 gap-2 @md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] @md:items-end"
                    >
                      <SelectField
                        label={<>Column{suffix}</>}
                        value={filter.column}
                        disabled={busy}
                        options={filterColumns.map(({ name }) => ({
                          value: name,
                          label: name,
                        }))}
                        onChange={(name) => {
                          const column = filterColumns.find(
                            (field) => field.name === name,
                          );
                          if (column)
                            changeFilter(filter.key, {
                              column: name,
                              value:
                                analysisFilterKind(column.type) === "boolean"
                                  ? "true"
                                  : "",
                            });
                        }}
                      />
                      {kind === "boolean" ? (
                        <SelectField
                          label={<>Equals{suffix}</>}
                          value={filter.value}
                          disabled={busy}
                          onChange={(value) =>
                            changeFilter(filter.key, { value })
                          }
                          options={[
                            { value: "true", label: "True" },
                            { value: "false", label: "False" },
                          ]}
                        />
                      ) : (
                        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
                          Equals{suffix}
                          <input
                            className={fieldClass}
                            type={isNumber ? "number" : "text"}
                            step={kind === "integer" ? "1" : "any"}
                            required={isNumber}
                            value={filter.value}
                            onChange={(event) =>
                              changeFilter(filter.key, {
                                value: event.currentTarget.value,
                              })
                            }
                          />
                        </label>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 justify-self-start"
                        aria-label={`Remove filter ${index + 1}`}
                        onClick={() =>
                          changeDraft({
                            filters: draft.filters.filter(
                              ({ key }) => key !== filter.key,
                            ),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </details>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="h-9 justify-self-start">
          Build chart
        </Button>
      </fieldset>
    </form>
  );
}
