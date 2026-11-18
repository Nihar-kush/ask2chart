import { quoteIdentifier, type SqlParameter } from "@/lib/duckdb/query";
import type { CompiledAnalysis } from "@/types/analysis";
import type { DatasetColumn } from "@/types/dataset";
import { analysisPlanSchema } from "./analysisPlanSchema";

const integerType = /^U?(?:TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT)$/;
const numericType = /^(FLOAT|DOUBLE|DECIMAL\(\d+,\s*\d+\))$/;
const dateType = /^(DATE|TIMESTAMP(?:_(?:S|MS|NS)| WITH TIME ZONE)?)$/;

export function isDateColumn(type: string) {
  return dateType.test(type);
}

export function isNumericColumn(type: string) {
  return integerType.test(type) || numericType.test(type);
}

export function analysisFilterKind(type: string) {
  if (type === "VARCHAR") return "text";
  if (type === "BOOLEAN") return "boolean";
  if (integerType.test(type)) return "integer";
  if (numericType.test(type)) return "number";
  return null;
}

function supportsEquality(type: string, value: SqlParameter) {
  const kind = analysisFilterKind(type);
  if (kind === "text") return typeof value === "string";
  if (kind === "boolean") return typeof value === "boolean";
  if (typeof value !== "number") return false;
  return kind === "integer" ? Number.isSafeInteger(value) : kind === "number";
}

export function compileAnalysisPlan(
  input: unknown,
  columns: DatasetColumn[],
): CompiledAnalysis {
  const parsed = analysisPlanSchema.safeParse(input);
  if (!parsed.success) throw new Error("This analysis plan is invalid.");
  const { data: plan } = parsed;

  function findColumn(name: string) {
    const column = columns.find((column) => column.name === name);
    if (!column)
      throw new Error(`This dataset is missing the “${name}” column.`);
    return column;
  }

  const group = findColumn(plan.groupBy.column);
  const groupColumn = quoteIdentifier(group.name);
  const byMonth = plan.groupBy.bucket === "month";

  if (byMonth && !isDateColumn(group.type)) {
    throw new Error(
      `“${group.name}” needs to be a date or timestamp to group by month.`,
    );
  }
  if (
    plan.chart === "line" &&
    (!byMonth || plan.sort.by !== "group" || plan.sort.direction !== "asc")
  ) {
    throw new Error("Line charts need months in chronological order.");
  }

  let metricExpression = "COUNT(*)";
  if (plan.metric.aggregation !== "count") {
    const metric = findColumn(plan.metric.column);
    if (!isNumericColumn(metric.type)) {
      throw new Error(
        `“${metric.name}” needs to be numeric for this calculation.`,
      );
    }
    metricExpression = `${plan.metric.aggregation.toUpperCase()}(${quoteIdentifier(metric.name)})`;
  }

  const conditions = [`${groupColumn} IS NOT NULL`];
  const parameters: SqlParameter[] = [];
  for (const filter of plan.filters) {
    const column = findColumn(filter.column);
    if (!supportsEquality(column.type, filter.equals)) {
      throw new Error(
        `The filter value does not match the type of “${column.name}”.`,
      );
    }
    conditions.push(`${quoteIdentifier(column.name)} = ?`);
    parameters.push(filter.equals);
  }

  const groupExpression = byMonth
    ? `DATE_TRUNC('month', ${groupColumn})`
    : groupColumn;
  const groupLabel = byMonth
    ? "STRFTIME(group_value, '%Y-%m')"
    : "CAST(group_value AS VARCHAR)";
  const direction = plan.sort.direction.toUpperCase();
  const order =
    plan.sort.by === "group"
      ? `group_value ${direction}`
      : `metric_value ${direction} NULLS LAST, group_value ASC`;
  const sql = `WITH grouped AS (
  SELECT ${groupExpression} AS group_value, ${metricExpression} AS metric_value
  FROM dataset
  WHERE ${conditions.join(" AND ")}
  GROUP BY 1
)
SELECT ${groupLabel} AS group_label, CAST(metric_value AS VARCHAR) AS metric_text
FROM grouped
ORDER BY ${order}
LIMIT ?`;

  return { plan, sql, parameters: [...parameters, plan.limit] };
}
