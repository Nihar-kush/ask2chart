import { DuckDBDataProtocol } from "@duckdb/duckdb-wasm";
import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";
import type { Dataset } from "@/types/dataset";

let nextDatasetId = 0;

export async function importDataset(
  engine: DuckDBEngine,
  file: File,
): Promise<Dataset> {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Choose a file with a .csv extension.");
  }
  if (file.size === 0) {
    throw new Error("This CSV is empty. Choose a file that contains data.");
  }

  return engine.withConnection(async (connection, database) => {
    // Closing the connection rolls back the replacement if it fails before COMMIT.
    await connection.query("BEGIN TRANSACTION");

    const importStartedAt = performance.now();
    await database.registerFileHandle(
      "dataset.csv",
      file,
      DuckDBDataProtocol.BROWSER_FILEREADER,
      true,
    );

    let importDurationMs: number;
    try {
      await connection.query(
        "CREATE OR REPLACE TABLE dataset AS " +
          "SELECT *, row_number() OVER () AS __ask2chart_row_id FROM read_csv('dataset.csv')",
      );
      importDurationMs = performance.now() - importStartedAt;
    } finally {
      if (!database.isDetached()) {
        await database.dropFile("dataset.csv");
      }
    }

    const schema = await connection.query("DESCRIBE dataset");
    const count = await connection.query(
      "SELECT count(*) AS row_count FROM dataset",
    );
    const columns = schema.toArray().map((column) => ({
      name: String(column.column_name),
      type: String(column.column_type),
    }));
    // DuckDB renames the last column if a CSV header already uses this name.
    const rowIdColumn = columns.pop();
    if (!rowIdColumn) throw new Error("Could not read the dataset schema.");

    await connection.query("COMMIT");
    return {
      id: ++nextDatasetId,
      name: file.name,
      rowCount: Number(count.get(0)?.row_count ?? 0),
      columns,
      rowIdColumn: rowIdColumn.name,
      importDurationMs,
    };
  });
}
