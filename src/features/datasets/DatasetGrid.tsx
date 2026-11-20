import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";
import type {
  Dataset,
  DatasetColumn,
  DatasetFilter,
  DatasetRow,
  DatasetSort,
} from "@/types/dataset";
import { useDatasetRowCount, useDatasetRows } from "./useDatasetRows";

const rowHeight = 36;
const headerHeight = 56;
const columnSize = { size: 168, minSize: 96, maxSize: 520 };

type DatasetGridProps = {
  dataset: Dataset;
  engine: DuckDBEngine;
  filter: DatasetFilter | null;
};

export function DatasetGrid({ dataset, engine, filter }: DatasetGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [attempt, setAttempt] = useState(0);
  const { rowCount, isCounting, countError } = useDatasetRowCount(
    engine,
    dataset,
    filter,
    attempt,
  );

  const sort = useMemo<DatasetSort | null>(() => {
    const first = sorting[0];
    const column = first && dataset.columns[Number(first.id)];
    return column
      ? { column: column.name, direction: first.desc ? "desc" : "asc" }
      : null;
  }, [dataset, sorting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [filter]);

  const columns = useMemo<ColumnDef<DatasetRow>[]>(
    () =>
      dataset.columns.map(({ name }, index) => ({
        id: String(index),
        header: name,
        accessorFn: (row) => row.values[index],
      })),
    [dataset],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- The grid reads the current virtualizer state on each render
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    scrollMargin: headerHeight,
    overscan: 5,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const firstRow = virtualRows[0];
  const lastRow = virtualRows.at(-1);

  const { rows, rowOffset, isLoading, error } = useDatasetRows(
    engine,
    dataset,
    filter,
    sort,
    {
      firstIndex: firstRow?.index ?? 0,
      lastIndex: lastRow?.index ?? 0,
      rowCount,
      attempt,
    },
  );

  const table = useReactTable({
    data: rows,
    columns,
    defaultColumn: columnSize,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    state: { sorting },
    manualSorting: true,
    enableMultiSort: false,
    sortDescFirst: false,
    columnResizeMode: "onChange",
    onSortingChange: (update) => {
      setSorting(update);
      scrollRef.current?.scrollTo({ top: 0 });
    },
  });

  const tableRows = table.getRowModel().rows;
  const columnCount = columns.length;
  const topSpace = firstRow ? firstRow.start - headerHeight : 0;
  const bottomSpace = lastRow
    ? virtualizer.getTotalSize() - (lastRow.end - headerHeight)
    : 0;
  const queryError = countError ?? error;

  let status = "";
  if (isCounting) {
    status = "Checking for matching rows…";
  } else if (isLoading) {
    status = "Loading rows…";
  } else if (rowCount === 0) {
    status = filter
      ? "No rows match this filter."
      : "This dataset has no data rows.";
  } else if (filter) {
    status = `${rowCount.toLocaleString()} of ${dataset.rowCount.toLocaleString()} rows match.`;
  }

  return (
    <>
      <div
        ref={scrollRef}
        role="region"
        aria-label="Dataset rows"
        tabIndex={0}
        className="table-scroll h-120 w-fit max-w-full overflow-auto rounded-xl border border-panel-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <table
          className="table-fixed border-separate border-spacing-0 text-left text-sm"
          aria-rowcount={rowCount + 1}
          aria-busy={isCounting || isLoading}
          style={{ width: table.getTotalSize() }}
        >
          <colgroup>
            {table.getVisibleLeafColumns().map((column) => (
              <col key={column.id} style={{ width: column.getSize() }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header, index) => (
                  <DatasetColumnHeader
                    key={header.id}
                    header={header}
                    column={dataset.columns[index]}
                  />
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {topSpace > 0 && (
              <tr aria-hidden="true">
                <td colSpan={columnCount} style={{ height: topSpace }} />
              </tr>
            )}
            {virtualRows.map(({ index }) => {
              const row = tableRows[index - rowOffset];
              if (!row) {
                return (
                  <tr key={`pending-${index}`} aria-hidden="true">
                    <td
                      className="h-9 border-b border-panel-border"
                      colSpan={columnCount}
                    />
                  </tr>
                );
              }
              return (
                <tr key={row.id} aria-rowindex={index + 2}>
                  {row.getVisibleCells().map((cell) => {
                    const value = cell.getValue<string | null>();
                    return (
                      <td
                        key={cell.id}
                        className="h-9 truncate border-b border-panel-border px-3 tabular-nums"
                        title={value ?? undefined}
                      >
                        {value ?? (
                          <span className="text-muted-foreground">NULL</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {bottomSpace > 0 && (
              <tr aria-hidden="true">
                <td colSpan={columnCount} style={{ height: bottomSpace }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {queryError ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-destructive">
            {queryError}
          </p>
          <Button
            variant="outline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      ) : (
        <p role="status" className="min-h-5 text-sm text-muted-foreground">
          {status}
        </p>
      )}
    </>
  );
}

function DatasetColumnHeader({
  header,
  column,
}: {
  header: Header<DatasetRow, unknown>;
  column: DatasetColumn;
}) {
  const sorted = header.column.getIsSorted();
  const SortIcon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  const sortDirection =
    sorted === "asc"
      ? "ascending"
      : sorted === "desc"
        ? "descending"
        : undefined;
  const startResize = header.getResizeHandler();

  return (
    <th
      scope="col"
      aria-sort={sortDirection}
      className="relative h-14 border-r border-b border-panel-border px-3 pr-5 last:border-r-0"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-sm text-left font-medium focus-visible:outline-2"
        title={`Sort by ${column.name}`}
        onClick={header.column.getToggleSortingHandler()}
      >
        <span className="min-w-0">
          <span className="block truncate">{column.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {column.type}
          </span>
        </span>
        <SortIcon
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        aria-label={`Resize ${column.name} column`}
        aria-keyshortcuts="ArrowLeft ArrowRight Enter"
        title="Drag or use arrow keys to resize. Press Enter to reset."
        className="absolute inset-y-0 right-0 w-2 cursor-col-resize touch-none hover:bg-ring/40 focus-visible:bg-ring/40 focus-visible:outline-2"
        onMouseDown={startResize}
        onTouchStart={startResize}
        onDoubleClick={() => header.column.resetSize()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            header.column.resetSize();
            return;
          }

          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const step = event.key === "ArrowRight" ? 16 : -16;
          const size = Math.min(
            columnSize.maxSize,
            Math.max(columnSize.minSize, header.getSize() + step),
          );
          header.getContext().table.setColumnSizing((previous) => ({
            ...previous,
            [header.column.id]: size,
          }));
        }}
      />
    </th>
  );
}
