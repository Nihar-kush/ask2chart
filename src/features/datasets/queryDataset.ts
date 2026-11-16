import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";
import type {
  Dataset,
  DatasetFilter,
  DatasetRow,
  DatasetSort,
} from "@/types/dataset";

function quoteColumn(name: string) {
  return `dataset."${name.replaceAll('"', '""')}"`;
}

function whereClause(filter: DatasetFilter | null) {
  return filter
    ? `WHERE contains(lower(CAST(${quoteColumn(filter.column)} AS VARCHAR)), lower(?))`
    : "";
}

function query(
  engine: DuckDBEngine,
  sql: string,
  filter: DatasetFilter | null,
) {
  return engine.withConnection(async (connection, database) => {
    if (!filter) return connection.query(sql);

    const statement = await connection.prepare(sql);
    try {
      return await statement.query(filter.text);
    } finally {
      if (!database.isDetached()) await statement.close();
    }
  });
}

export async function getFilteredRowCount(
  engine: DuckDBEngine,
  filter: DatasetFilter,
) {
  const result = await query(
    engine,
    `SELECT count(*) AS row_count FROM dataset ${whereClause(filter)}`,
    filter,
  );
  return Number(result.get(0)?.row_count ?? 0);
}

export async function getDatasetRows(
  engine: DuckDBEngine,
  dataset: Dataset,
  filter: DatasetFilter | null,
  sort: DatasetSort | null,
  offset: number,
  limit: number,
): Promise<DatasetRow[]> {
  const rowId = quoteColumn(dataset.rowIdColumn);
  const columns = dataset.columns.map(
    ({ name }) => `CAST(${quoteColumn(name)} AS VARCHAR)`,
  );
  const order = sort
    ? `${quoteColumn(sort.column)} ${sort.direction} NULLS LAST, ${rowId}`
    : rowId;

  const result = await query(
    engine,
    `SELECT ${rowId}, ${columns.join(", ")}
      FROM dataset ${whereClause(filter)}
      ORDER BY ${order}
      LIMIT ${limit} OFFSET ${offset}`,
    filter,
  );

  const ids = result.getChildAt(0);
  if (!ids) throw new Error("Could not read the dataset row IDs.");
  const values = columns.map((_, index) => result.getChildAt(index + 1));

  return Array.from({ length: result.numRows }, (_, index) => ({
    id: String(ids.get(index)),
    values: values.map((column) => {
      const value = column?.get(index);
      return value == null ? null : String(value);
    }),
  }));
}
