import { Link, useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import type { WorkspaceDataset } from "@/types/dataset";
import { DatasetAnalysis } from "./DatasetAnalysis";

export function ChartsPage() {
  const { engine, dataset, importingFile, error, openSample } =
    useOutletContext<WorkspaceDataset>();

  return (
    <div className="grid min-w-0 gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Chart Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask a question or run a preset on your active dataset.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={Boolean(importingFile)}
          onClick={openSample}
        >
          Try sample data
        </Button>
      </header>

      {importingFile && (
        <p
          role="status"
          className="wrap-break-word text-sm text-muted-foreground"
        >
          Importing {importingFile.name}…
        </p>
      )}
      {error && (
        <p role="alert" className="wrap-break-word text-sm text-destructive">
          {error}
        </p>
      )}
      {!importingFile &&
        (dataset ? (
          <DatasetAnalysis key={dataset.id} dataset={dataset} engine={engine} />
        ) : (
          <section className="grid justify-items-start gap-3 rounded-xl border p-5">
            <h2 className="font-semibold">Choose a dataset to get started</h2>
            <p className="text-sm text-muted-foreground">
              Load the sample sales CSV or open an existing CSV in Data
              Explorer.
            </p>
            <Link
              to="/workspace/datasets"
              className="text-sm font-medium underline underline-offset-4 focus-visible:outline-2"
            >
              Open Data Explorer
            </Link>
          </section>
        ))}
    </div>
  );
}
