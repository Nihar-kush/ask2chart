import { DuckDBDataProtocol } from "@duckdb/duckdb-wasm";
import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";

const previewRowLimit = 50;

export type DatasetPreview = {
  name: string;
  rowCount: number;
  columns: { name: string; type: string }[];
  rows: (string | null)[][];
  importDurationMs: number;
};

export async function importDataset(
  engine: DuckDBEngine,
  file: File,
): Promise<DatasetPreview> {
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
        "CREATE OR REPLACE TABLE dataset AS SELECT * FROM read_csv('dataset.csv')",
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
    // Cast only the preview so dates and large integers display as DuckDB formats them.
    const sample = await connection.query(
      `SELECT COLUMNS(*)::VARCHAR FROM dataset LIMIT ${previewRowLimit}`,
    );
    const columns = schema.toArray().map((column) => ({
      name: String(column.column_name),
      type: String(column.column_type),
    }));
    const vectors = columns.map((_, index) => sample.getChildAt(index));
    const rows = Array.from({ length: sample.numRows }, (_, index) =>
      vectors.map((vector) => {
        const value = vector?.get(index);
        return value == null ? null : String(value);
      }),
    );

    await connection.query("COMMIT");
    return {
      name: file.name,
      rowCount: Number(count.get(0)?.row_count ?? 0),
      columns,
      rows,
      importDurationMs,
    };
  });
}
