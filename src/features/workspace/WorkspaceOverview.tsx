import {
  ArrowRight,
  ChartColumn,
  CircleAlert,
  CircleCheck,
  FileSpreadsheet,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import { ImportCsvButton } from "@/features/datasets/ImportCsvButton";
import type { Dataset, WorkspaceDataset } from "@/types/dataset";
import { OverviewRecentAnalyses, OverviewSavedWork } from "./OverviewActivity";

const quickActions = [
  { label: "Ask AI", to: "charts?view=assistant", icon: Sparkles },
  { label: "Create chart", to: "charts?view=builder", icon: ChartColumn },
  { label: "View dashboards", to: "dashboards", icon: LayoutDashboard },
];

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
  const { dataset, loadingMessage, storageWarning, openFile, openSample } =
    useOutletContext<WorkspaceDataset>();

  return (
    <div className="mx-auto grid max-w-6xl min-w-0 gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>

      {loadingMessage ? (
        <section
          aria-label="Loading workspace"
          className="grid min-h-35 items-center rounded-xl border bg-card px-5 text-card-foreground"
        >
          <p
            role="status"
            className="wrap-break-word text-sm text-muted-foreground"
          >
            {loadingMessage}
          </p>
        </section>
      ) : dataset ? (
        <>
          <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(13rem,2fr)]">
            <ActiveDataset
              dataset={dataset}
              selectionSaved={!storageWarning}
              onImport={openFile}
            />
            <nav
              aria-labelledby="workspace-quick-actions"
              className="grid gap-3"
            >
              <h2 id="workspace-quick-actions" className="font-semibold">
                Quick actions
              </h2>
              <ul className="divide-y border-y">
                {quickActions.map(({ label, to, icon: Icon }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="flex min-h-13 items-center gap-3 px-2 text-sm font-medium hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2"
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <span className="flex-1">{label}</span>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(13rem,2fr)]">
            <OverviewRecentAnalyses key={dataset.id} datasetId={dataset.id} />
            <OverviewSavedWork />
          </div>
        </>
      ) : (
        <>
          <section
            aria-labelledby="empty-workspace-title"
            className="grid max-w-2xl justify-items-start gap-4 rounded-xl border bg-card p-5 text-card-foreground sm:p-7"
          >
            <FileSpreadsheet
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
            <div className="grid gap-1">
              <h2
                id="empty-workspace-title"
                className="text-lg font-semibold tracking-tight"
              >
                Open a dataset
              </h2>
              <p className="max-w-lg text-sm text-muted-foreground">
                Import a CSV to browse its rows, ask questions, and build
                charts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ImportCsvButton size="lg" onImport={openFile} />
              <Button variant="outline" size="lg" onClick={openSample}>
                Try sample data
              </Button>
            </div>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              Your CSV is processed locally in this browser.
            </p>
          </section>
          <OverviewSavedWork hideWhenEmpty />
        </>
      )}
    </div>
  );
}

function ActiveDataset({
  dataset,
  selectionSaved,
  onImport,
}: {
  dataset: Dataset;
  selectionSaved: boolean;
  onImport: (file: File) => void;
}) {
  const StorageIcon = selectionSaved ? CircleCheck : CircleAlert;
  const facts = [
    ["Total rows", dataset.rowCount.toLocaleString()],
    ["Columns", dataset.columns.length.toLocaleString()],
    ["File size", formatFileSize(dataset.fileSize)],
  ];

  return (
    <section
      aria-labelledby="active-dataset-title"
      className="min-w-0 rounded-xl border bg-card text-card-foreground"
    >
      <div className="grid gap-3 p-4 sm:p-5">
        <h2 id="active-dataset-title" className="font-semibold">
          Active dataset
        </h2>
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <FileSpreadsheet aria-hidden="true" className="size-4" />
          </div>
          <div className="grid min-w-0 gap-0.5">
            <p className="wrap-break-word text-lg font-semibold tracking-tight">
              {dataset.name}
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <StorageIcon aria-hidden="true" className="size-3.5 shrink-0" />
              {selectionSaved
                ? "Saved in this browser"
                : "Active selection not saved"}
            </p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 border-y px-4 py-3 sm:px-5">
        {facts.map(([label, value]) => (
          <div key={label} className="grid min-w-0 gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="wrap-break-word text-lg font-medium tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2 p-4 sm:px-5">
        <Button nativeButton={false} render={<Link to="datasets" />}>
          Explore dataset
          <ArrowRight aria-hidden="true" />
        </Button>
        <ImportCsvButton variant="outline" onImport={onImport} />
      </div>
    </section>
  );
}
