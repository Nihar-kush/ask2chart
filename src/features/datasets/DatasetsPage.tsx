import { useRef } from "react";
import { useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import type { WorkspaceDataset } from "@/types/dataset";
import { DatasetExplorer } from "./DatasetExplorer";

export function DatasetsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { engine, importingFile, dataset, error, openFile, openSample } =
    useOutletContext<WorkspaceDataset>();

  const status = importingFile
    ? `Importing ${importingFile.name}…`
    : dataset
      ? `Loaded ${dataset.name} with ${dataset.rowCount.toLocaleString()} rows.`
      : "No dataset loaded.";

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
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Choose a CSV file"
            hidden
            onChange={(event) => {
              const selectedFile = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (selectedFile) openFile(selectedFile);
            }}
          />
          <Button
            disabled={Boolean(importingFile)}
            onClick={() => inputRef.current?.click()}
          >
            Open CSV
          </Button>
          <Button
            variant="outline"
            disabled={Boolean(importingFile)}
            onClick={openSample}
          >
            Try sample data
          </Button>
        </div>
      </header>

      <p
        role="status"
        className={
          !importingFile && dataset
            ? "sr-only"
            : "text-sm text-muted-foreground"
        }
      >
        {status}
      </p>

      {error && (
        <p
          role="alert"
          className="max-w-2xl wrap-break-word text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {!importingFile && dataset && (
        <DatasetExplorer key={dataset.id} dataset={dataset} engine={engine} />
      )}
    </div>
  );
}
