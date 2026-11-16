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
  return engine.withConnection(async (connection, database) => {
    if (parameters.length === 0) return connection.query(sql);

    const statement = await connection.prepare(sql);
    try {
      return await statement.query(...parameters);
    } finally {
      if (!database.isDetached()) await statement.close();
    }
  });
}
