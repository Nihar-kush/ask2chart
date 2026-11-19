import { useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import type { WorkspaceDataset } from "@/types/dataset";
import { DatasetExplorer } from "./DatasetExplorer";
import { ImportCsvButton } from "./ImportCsvButton";
import { SavedDatasets } from "./SavedDatasets";

export function DatasetsPage() {
  const {
    engine,
    loadingMessage,
    dataset,
    openFile,
    openSample,
    openSaved,
    deleteSaved,
  } = useOutletContext<WorkspaceDataset>();
  const status =
    loadingMessage ??
    (dataset
      ? `Loaded ${dataset.name} with ${dataset.rowCount.toLocaleString()} rows.`
      : "No dataset loaded.");

  return (
    <div className="grid min-w-0 gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Data Explorer
          </h1>
          <p className="text-sm text-muted-foreground">
            Open a CSV to browse, sort, and filter it in your browser.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportCsvButton
            disabled={Boolean(loadingMessage)}
            onImport={openFile}
          >
            Open CSV
          </ImportCsvButton>
          <Button
            variant="outline"
            disabled={Boolean(loadingMessage)}
            onClick={openSample}
          >
            Try sample data
          </Button>
        </div>
      </header>

      <p
        role="status"
        className={
          !loadingMessage && dataset
            ? "sr-only"
            : "text-sm text-muted-foreground"
        }
      >
        {status}
      </p>

      <SavedDatasets
        activeId={dataset?.id}
        disabled={Boolean(loadingMessage)}
        onOpen={openSaved}
        onDelete={deleteSaved}
      />
      {!loadingMessage && dataset && (
        <DatasetExplorer key={dataset.id} dataset={dataset} engine={engine} />
      )}
    </div>
  );
}
