import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";

export type DatasetColumn = {
  name: string;
  type: string;
};

export type Dataset = {
  id: string;
  name: string;
  rowCount: number;
  columns: DatasetColumn[];
  rowIdColumn: string;
  importDurationMs: number;
};

export type SavedDataset = Pick<
  Dataset,
  "id" | "name" | "rowCount" | "columns"
> & {
  addedAt: number;
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
  loadingMessage: string | null;
  dataset: Dataset | null;
  error: string | null;
  storageWarning: string | null;
  openFile: (file: File) => void;
  openSample: () => void;
  openSaved: (dataset: SavedDataset) => void;
  deleteSaved: (id: string) => Promise<void>;
};
