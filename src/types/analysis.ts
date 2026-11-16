import type { z } from "zod";
import type { analysisPlanSchema } from "@/features/charts/analysisPlanSchema";
import type { SqlParameter } from "@/lib/duckdb/query";

export type AnalysisPlan = z.infer<typeof analysisPlanSchema>;

export type CompiledAnalysis = {
  plan: AnalysisPlan;
  sql: string;
  parameters: SqlParameter[];
};

export type AnalysisRow = {
  group: string;
  value: string | null;
};

export type AnalysisResult = CompiledAnalysis & {
  rows: AnalysisRow[];
  queryDurationMs: number;
};
