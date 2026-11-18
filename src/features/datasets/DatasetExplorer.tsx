import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/SelectField";
import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";
import type { Dataset, DatasetFilter } from "@/types/dataset";
import { DatasetGrid } from "./DatasetGrid";

const durationFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  style: "unit",
  unit: "millisecond",
});

const fieldClass =
  "h-9 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-ring focus-visible:outline-2";

export function DatasetExplorer({
  dataset,
  engine,
}: {
  dataset: Dataset;
  engine: DuckDBEngine;
}) {
  const nameId = useId();
  const [column, setColumn] = useState(dataset.columns[0]?.name ?? "");
  const [search, setSearch] = useState("");
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setFilterText(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filter = useMemo<DatasetFilter | null>(
    () => (filterText ? { column, text: filterText } : null),
    [column, filterText],
  );

  return (
    <section aria-labelledby={nameId} className="grid min-w-0 gap-3">
      <div>
        <h2 id={nameId} className="wrap-break-word font-semibold">
          {dataset.name}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {dataset.rowCount.toLocaleString()} rows
          {" · "}
          {dataset.columns.length.toLocaleString()} columns
          {" · "}Imported in {durationFormat.format(dataset.importDurationMs)}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <SelectField
          label="Filter column"
          className="w-44 max-w-full"
          value={column}
          options={dataset.columns.map(({ name }) => ({
            value: name,
            label: name,
          }))}
          onChange={setColumn}
        />
        <label className="grid min-w-0 gap-1 text-sm">
          Contains
          <input
            className={fieldClass}
            type="search"
            placeholder="Search values"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          className="h-9"
          disabled={!search && !filter}
          onClick={() => {
            setSearch("");
            setFilterText("");
          }}
        >
          Clear filter
        </Button>
      </div>

      <DatasetGrid dataset={dataset} engine={engine} filter={filter} />
    </section>
  );
}
