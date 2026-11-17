import type { AnalysisPlan } from "@/types/analysis";

export function getAnalysisLabels({ groupBy, metric }: AnalysisPlan) {
  return {
    groupLabel: groupBy.bucket === "month" ? "Month" : groupBy.column,
    metricLabel:
      metric.aggregation === "count"
        ? "Row count"
        : `${metric.aggregation === "sum" ? "Total" : "Average"} ${metric.column}`,
  };
}
