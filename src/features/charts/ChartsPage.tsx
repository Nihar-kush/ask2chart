import { Link, useOutletContext, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { sampleDatasetId } from "@/lib/workspaceDb";
import type { WorkspaceDataset } from "@/types/dataset";
import { DatasetAnalysis } from "./DatasetAnalysis";

export function ChartsPage() {
  const { engine, dataset, loadingMessage, openSample } =
    useOutletContext<WorkspaceDataset>();
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get("view");
  const analysisId = Number(searchParams.get("analysis"));
  const initialAnalysisId =
    Number.isSafeInteger(analysisId) && analysisId > 0 ? analysisId : null;

  return (
    <div className="grid min-w-0 gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Chart Studio</h1>
        {dataset?.id !== sampleDatasetId && (
          <Button
            variant="outline"
            disabled={Boolean(loadingMessage)}
            onClick={openSample}
          >
            Try sample data
          </Button>
        )}
      </header>

      {loadingMessage && (
        <p
          role="status"
          className="wrap-break-word text-sm text-muted-foreground"
        >
          {loadingMessage}
        </p>
      )}
      {!loadingMessage &&
        (dataset ? (
          <DatasetAnalysis
            key={`${dataset.id}:${initialView ?? ""}:${initialAnalysisId ?? ""}`}
            dataset={dataset}
            engine={engine}
            initialView={initialView}
            initialAnalysisId={initialAnalysisId}
          />
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
