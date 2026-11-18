import { DuckDBDataProtocol, type AsyncDuckDB } from "@duckdb/duckdb-wasm";

export async function withCsvFile<T>(
  database: AsyncDuckDB,
  file: File,
  read: (path: string) => Promise<T>,
) {
  const path = `ask2chart-${crypto.randomUUID()}.csv`;
  await database.registerFileHandle(
    path,
    file,
    DuckDBDataProtocol.BROWSER_FILEREADER,
    true,
  );

  try {
    return await read(path);
  } finally {
    if (!database.isDetached()) await database.dropFile(path);
  }
}
