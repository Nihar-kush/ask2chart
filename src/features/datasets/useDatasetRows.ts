import { useEffect, useState } from "react";
import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";
import type {
  Dataset,
  DatasetFilter,
  DatasetRow,
  DatasetSort,
} from "@/types/dataset";
import { getDatasetRows, getFilteredRowCount } from "./queryDataset";

const rowsPerBlock = 128;
const emptyRows: DatasetRow[] = [];

type FilterCount = {
  filter: DatasetFilter;
  attempt: number;
  rowCount: number | null;
  error: string | null;
};

type RowWindow = {
  filter: DatasetFilter | null;
  sort: DatasetSort | null;
  attempt: number;
  offset: number;
  limit: number;
  rows: DatasetRow[];
  error: string | null;
};

export function useDatasetRowCount(
  engine: DuckDBEngine,
  dataset: Dataset,
  filter: DatasetFilter | null,
  attempt: number,
) {
  const [result, setResult] = useState<FilterCount | null>(null);

  useEffect(() => {
    if (!filter) return;

    let isCurrent = true;
    void getFilteredRowCount(engine, filter).then(
      (rowCount) => {
        if (isCurrent) setResult({ filter, attempt, rowCount, error: null });
      },
      () => {
        if (isCurrent) {
          setResult({
            filter,
            attempt,
            rowCount: null,
            error: "Could not count matching rows.",
          });
        }
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [engine, filter, attempt]);

  const current =
    result?.filter === filter && result.attempt === attempt ? result : null;

  return {
    rowCount: filter ? (current?.rowCount ?? 0) : dataset.rowCount,
    isCounting: Boolean(filter && !current),
    countError: current?.error ?? null,
  };
}

export function useDatasetRows(
  engine: DuckDBEngine,
  dataset: Dataset,
  filter: DatasetFilter | null,
  sort: DatasetSort | null,
  {
    firstIndex,
    lastIndex,
    rowCount,
    attempt,
  }: {
    firstIndex: number;
    lastIndex: number;
    rowCount: number;
    attempt: number;
  },
) {
  const [result, setResult] = useState<RowWindow | null>(null);

  // Buffer rows on both sides so small scrolls can reuse the rows we already fetched
  const offset = Math.max(
    0,
    (Math.floor(firstIndex / rowsPerBlock) - 1) * rowsPerBlock,
  );
  const end = (Math.floor(lastIndex / rowsPerBlock) + 2) * rowsPerBlock;
  const limit = Math.max(0, Math.min(rowCount, end) - offset);

  useEffect(() => {
    if (limit === 0) return;

    let isCurrent = true;
    const request = { filter, sort, attempt, offset, limit };

    // Wait briefly so fast scrolling skips unnecessary queries
    const timer = window.setTimeout(async () => {
      try {
        const rows = await getDatasetRows(
          engine,
          dataset,
          filter,
          sort,
          offset,
          limit,
        );
        if (isCurrent) setResult({ ...request, rows, error: null });
      } catch {
        if (isCurrent) {
          setResult({
            ...request,
            rows: emptyRows,
            error: "Could not load these rows.",
          });
        }
      }
    }, 50);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [engine, dataset, filter, sort, offset, limit, attempt]);

  const current =
    result?.filter === filter &&
    result.sort === sort &&
    result.attempt === attempt
      ? result
      : null;
  const error =
    current?.offset === offset && current.limit === limit
      ? current.error
      : null;
  const rows = current?.rows ?? emptyRows;
  const rowOffset = current?.offset ?? 0;
  const isLoading =
    rowCount > 0 &&
    !error &&
    (firstIndex < rowOffset || lastIndex >= rowOffset + rows.length);

  return { rows, rowOffset, isLoading, error };
}
