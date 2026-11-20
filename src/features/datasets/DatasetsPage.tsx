import { useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import { WorkspacePage } from "@/features/workspace/WorkspacePage";
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
    <WorkspacePage
      title="Data Explorer"
      actions={
        <>
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
        </>
      }
    >
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
    </WorkspacePage>
  );
}
