import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";

export type DatasetColumn = {
  name: string;
  type: string;
};

export type Dataset = {
  id: number;
  name: string;
  rowCount: number;
  columns: DatasetColumn[];
  rowIdColumn: string;
  importDurationMs: number;
};

export type DatasetRow = {
  id: string;
  values: (string | null)[];
};

export type DatasetFilter = {
  column: string;
  text: string;
};

export type DatasetSort = {
  column: string;
  direction: "asc" | "desc";
};

export type WorkspaceDataset = {
  engine: DuckDBEngine;
  importingFile: File | null;
  dataset: Dataset | null;
  error: string | null;
  openFile: (file: File) => void;
  openSample: () => void;
};
