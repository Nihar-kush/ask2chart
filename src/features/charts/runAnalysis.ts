import type { queryDuckDB } from "@/lib/duckdb/query";
import type { AnalysisResult, CompiledAnalysis } from "@/types/analysis";

export async function runAnalysis(
  analysis: CompiledAnalysis,
  query: (
    sql: CompiledAnalysis["sql"],
    parameters: CompiledAnalysis["parameters"],
  ) => ReturnType<typeof queryDuckDB>,
): Promise<AnalysisResult> {
  const start = performance.now();
  const table = await query(analysis.sql, analysis.parameters);
  const queryDurationMs = performance.now() - start;

  const rows = table.toArray().map((row) => ({
    group: String(row.group_label),
    value: row.metric_text == null ? null : String(row.metric_text),
  }));

  return { ...analysis, rows, queryDurationMs };
}
