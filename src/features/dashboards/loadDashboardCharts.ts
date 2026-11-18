import { compileAnalysisPlan } from "@/features/charts/compileAnalysisPlan";
import { runAnalysis } from "@/features/charts/runAnalysis";
import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";
import { queryConnection } from "@/lib/duckdb/query";
import { readSavedDataset } from "@/lib/workspaceDb";
import type { AnalysisResult } from "@/types/analysis";
import type { DashboardChart } from "@/types/dashboard";
import type { Dataset } from "@/types/dataset";

export type DashboardChartResult =
  | { result: AnalysisResult; datasetName: string }
  | { error: string };

export async function loadDashboardCharts(
  engine: DuckDBEngine,
  charts: DashboardChart[],
  activeDataset: Dataset | null,
  signal: AbortSignal,
  onResult: (id: string, state: DashboardChartResult) => void,
) {
  const byDataset = new Map<string, DashboardChart[]>();
  for (const chart of charts) {
    const group = byDataset.get(chart.datasetId);
    if (group) group.push(chart);
    else byDataset.set(chart.datasetId, [chart]);
  }

  for (const [datasetId, group] of byDataset) {
    if (signal.aborted) return;

    try {
      const active = activeDataset?.id === datasetId ? activeDataset : null;
      const saved = active ? null : await readSavedDataset(datasetId);
      signal.throwIfAborted();
      const datasetName = active?.name ?? saved?.file.name;
      if (!datasetName) throw new Error("The source CSV is missing.");

      await engine.withConnection(async (connection, database) => {
        signal.throwIfAborted();
        let columns = active?.columns ?? [];

        if (saved) {
          const { withCsvFile } = await import("@/lib/duckdb/withCsvFile");
          signal.throwIfAborted();

          // This connection sees its own dataset table without replacing the workspace table
          await withCsvFile(database, saved.file, (path) =>
            connection.query(
              `CREATE TEMP TABLE dataset AS SELECT * FROM read_csv('${path}')`,
            ),
          );
          signal.throwIfAborted();
          const schema = await connection.query("DESCRIBE dataset");
          columns = schema.toArray().map((column) => ({
            name: String(column.column_name),
            type: String(column.column_type),
          }));
        }

        for (const chart of group) {
          if (signal.aborted) return;
          try {
            const compiled = compileAnalysisPlan(chart.plan, columns);
            const result = await runAnalysis(compiled, (sql, parameters) =>
              queryConnection(connection, database, sql, parameters),
            );
            if (!signal.aborted) onResult(chart.id, { result, datasetName });
          } catch {
            if (!signal.aborted) {
              onResult(chart.id, {
                error: "Could not run this chart. Check its source CSV.",
              });
            }
          }
        }
      });
    } catch {
      if (signal.aborted) return;
      for (const chart of group) {
        onResult(chart.id, {
          error: "Could not open the source CSV for this chart.",
        });
      }
    }
  }
}
