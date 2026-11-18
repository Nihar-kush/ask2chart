import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { sampleDatasetId, workspaceDb } from "@/lib/workspaceDb";
import type { SavedDataset } from "@/types/dataset";

export function SavedDatasets({
  activeId,
  disabled,
  onOpen,
  onDelete,
}: {
  activeId?: string;
  disabled: boolean;
  onOpen: (dataset: SavedDataset) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const datasets = useLiveQuery(() =>
    workspaceDb.datasets
      .orderBy("addedAt")
      .reverse()
      .toArray()
      .catch(() => null),
  );

  return (
    <section aria-label="Saved datasets" className="grid gap-2">
      <h2 className="font-semibold">Saved datasets</h2>
      {datasets === undefined ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading saved datasets…
        </p>
      ) : datasets === null ? (
        <p role="alert" className="text-sm text-destructive">
          Saved datasets could not be read. You can still open a CSV.
        </p>
      ) : datasets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          CSVs you open appear here.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {datasets.map((dataset) => (
            <li
              key={dataset.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <div className="min-w-0">
                <p className="wrap-break-word text-sm font-medium">
                  {dataset.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dataset.id === sampleDatasetId && "Built-in sample · "}
                  {dataset.rowCount.toLocaleString()} rows ·{" "}
                  {dataset.columns.length} columns
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {dataset.id === activeId ? (
                  <span className="text-sm text-muted-foreground">Active</span>
                ) : (
                  <Button
                    variant="outline"
                    disabled={disabled}
                    onClick={() => onOpen(dataset)}
                  >
                    Open <span className="sr-only">{dataset.name}</span>
                  </Button>
                )}
                {dataset.id !== sampleDatasetId && (
                  <ConfirmAction
                    action="Delete dataset"
                    ariaLabel={`Delete ${dataset.name}`}
                    title={`Delete ${dataset.name}?`}
                    description="This removes the saved CSV, its analysis history, and charts pinned from this dataset."
                    disabled={disabled}
                    onConfirm={() => onDelete(dataset.id)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
