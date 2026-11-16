import type { DatasetPreview } from "./importDataset";

const durationFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  style: "unit",
  unit: "millisecond",
});

export function DatasetPreviewTable({ preview }: { preview: DatasetPreview }) {
  const { name, rowCount, columns, rows, importDurationMs } = preview;

  return (
    <section aria-labelledby="dataset-name" className="grid min-w-0 gap-3">
      <div>
        <h2
          id="dataset-name"
          className="wrap-break-word text-base font-semibold"
        >
          {name}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {rows.length.toLocaleString()} of {rowCount.toLocaleString()} rows
          {" · "}
          {columns.length.toLocaleString()} columns
          {" · "}Imported in {durationFormat.format(importDurationMs)}
        </p>
      </div>

      <div
        className="max-h-128 overflow-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2"
        role="region"
        aria-label="Dataset preview"
        tabIndex={0}
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.name}
                  scope="col"
                  className="px-3 py-2 font-medium"
                >
                  {column.name}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {column.type}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {columns.map((column, columnIndex) => {
                  const value = row[columnIndex];
                  return (
                    <td
                      key={column.name}
                      className="max-w-72 truncate px-3 py-2 tabular-nums"
                      title={value ?? undefined}
                    >
                      {value ?? (
                        <span className="text-muted-foreground">NULL</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rowCount === 0 && (
        <p className="text-sm text-muted-foreground">
          This CSV has column headers but no data rows.
        </p>
      )}
    </section>
  );
}
