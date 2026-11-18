import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import type { DuckDBEngine } from "./createDuckDB";

export type SqlParameter = string | number | boolean;

export function quoteIdentifier(name: string) {
  return `"${name.replaceAll('"', '""')}"`;
}

export function queryDuckDB(
  engine: DuckDBEngine,
  sql: string,
  parameters: SqlParameter[] = [],
) {
  return engine.withConnection((connection, database) =>
    queryConnection(connection, database, sql, parameters),
  );
}

export async function queryConnection(
  connection: AsyncDuckDBConnection,
  database: AsyncDuckDB,
  sql: string,
  parameters: SqlParameter[],
) {
  if (parameters.length === 0) return connection.query(sql);

  const statement = await connection.prepare(sql);
  try {
    return await statement.query(...parameters);
  } finally {
    if (!database.isDetached()) await statement.close();
  }
}
