import type { AnalysisPlan } from "@/types/analysis";

type AnalysisPreset = {
  title: string;
  description: string;
  plan: AnalysisPlan;
};

export const analysisPresets: AnalysisPreset[] = [
  {
    title: "Revenue by category",
    description:
      "Sum revenue for each product category and rank the largest totals first.",
    plan: {
      groupBy: { column: "category", bucket: "value" },
      metric: { aggregation: "sum", column: "revenue" },
      filters: [],
      sort: { by: "metric", direction: "desc" },
      limit: 12,
      chart: "bar",
    },
  },
  {
    title: "Monthly revenue",
    description:
      "Sum revenue by calendar month to see how it changes over time.",
    plan: {
      groupBy: { column: "order_date", bucket: "month" },
      metric: { aggregation: "sum", column: "revenue" },
      filters: [],
      sort: { by: "group", direction: "asc" },
      limit: 60,
      chart: "line",
    },
  },
];
