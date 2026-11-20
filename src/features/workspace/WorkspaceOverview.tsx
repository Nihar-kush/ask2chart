import {
  ArrowRight,
  ChartColumn,
  CircleAlert,
  CircleCheck,
  FileSpreadsheet,
} from "lucide-react";
import { Link, useNavigate, useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import { AskAnalysisForm } from "@/features/charts/AskAnalysisForm";
import { ImportCsvButton } from "@/features/datasets/ImportCsvButton";
import type { Dataset, WorkspaceDataset } from "@/types/dataset";
import { OverviewRecentAnalyses, OverviewSavedWork } from "./OverviewActivity";
import { WorkspaceEmptyState } from "./WorkspaceEmptyState";
import { WorkspacePage } from "./WorkspacePage";

const fileSizeFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

function formatFileSize(bytes: number) {
  if (bytes < 1_000) return `${fileSizeFormat.format(bytes)} B`;
  if (bytes < 1_000_000) return `${fileSizeFormat.format(bytes / 1_000)} KB`;
  if (bytes < 1_000_000_000)
    return `${fileSizeFormat.format(bytes / 1_000_000)} MB`;
  return `${fileSizeFormat.format(bytes / 1_000_000_000)} GB`;
}

export function WorkspaceOverview() {
  const navigate = useNavigate();
  const { dataset, loadingMessage, storageWarning, openFile, openSample } =
    useOutletContext<WorkspaceDataset>();

  return (
    <WorkspacePage
      title="Workspace"
      actions={
        dataset &&
        !loadingMessage && (
          <>
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link to="charts?view=builder" />}
            >
              <ChartColumn aria-hidden="true" />
              Create chart
            </Button>
            <ImportCsvButton variant="outline" onImport={openFile} />
          </>
        )
      }
    >
      {loadingMessage ? (
        <p
          role="status"
          className="wrap-break-word text-sm text-muted-foreground"
        >
          {loadingMessage}
        </p>
      ) : dataset ? (
        <div className="mx-auto grid w-full max-w-5xl gap-8 md:gap-10">
          <ActiveDataset dataset={dataset} selectionSaved={!storageWarning} />
          <div className="mx-auto w-full max-w-2xl py-1 sm:py-5">
            <AskAnalysisForm
              key={dataset.id}
              columns={dataset.columns}
              draftOnly
              onSubmit={(draft) => {
                void navigate("charts?view=assistant", {
                  state: { draft, datasetId: dataset.id },
                });
              }}
            />
          </div>
          <div className="grid min-w-0 gap-5 sm:grid-cols-2 sm:gap-6">
            <OverviewRecentAnalyses key={dataset.id} datasetId={dataset.id} />
            <OverviewSavedWork />
          </div>
        </div>
      ) : (
        <>
          <WorkspaceEmptyState
            icon={FileSpreadsheet}
            title="Open a dataset"
            description="Open a CSV to explore its rows, ask questions, and build charts. Your CSV is processed locally in this browser."
          >
            <ImportCsvButton size="lg" onImport={openFile} />
            <Button variant="outline" size="lg" onClick={openSample}>
              Try sample data
            </Button>
          </WorkspaceEmptyState>
          <OverviewSavedWork hideWhenEmpty />
        </>
      )}
    </WorkspacePage>
  );
}

function ActiveDataset({
  dataset,
  selectionSaved,
}: {
  dataset: Dataset;
  selectionSaved: boolean;
}) {
  const StorageIcon = selectionSaved ? CircleCheck : CircleAlert;
  const facts = [
    ["Rows", dataset.rowCount.toLocaleString()],
    ["Columns", dataset.columns.length.toLocaleString()],
    ["File size", formatFileSize(dataset.fileSize)],
  ];

  return (
    <section
      aria-labelledby="active-dataset-title"
      className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-panel-border pb-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-panel-border bg-card text-muted-foreground">
          <FileSpreadsheet aria-hidden="true" className="size-4" />
        </div>
        <div className="grid min-w-0 gap-0.5">
          <h2
            id="active-dataset-title"
            className="text-xs text-muted-foreground"
          >
            Active dataset
          </h2>
          <Link
            to="datasets"
            aria-label={`Explore dataset ${dataset.name}`}
            className="flex min-w-0 items-center gap-1.5 rounded-sm text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="wrap-anywhere">{dataset.name}</span>
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          </Link>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
        <dl className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs">
          {facts.map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <StorageIcon aria-hidden="true" className="size-3.5 shrink-0" />
          {selectionSaved
            ? "Saved in this browser"
            : "Active selection not saved"}
        </p>
      </div>
    </section>
  );
}
