import { useLiveQuery } from "dexie-react-hooks";
import { LayoutDashboard } from "lucide-react";
import { Link, useOutletContext, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { SelectField } from "@/components/ui/SelectField";
import { WorkspaceEmptyState } from "@/features/workspace/WorkspaceEmptyState";
import { WorkspacePage } from "@/features/workspace/WorkspacePage";
import { workspaceDb } from "@/lib/workspaceDb";
import type { WorkspaceDataset } from "@/types/dataset";
import { DashboardChartGrid } from "./DashboardChartGrid";
import { DashboardNameDialog } from "./DashboardNameDialog";
import { createDashboard, deleteDashboard } from "./dashboardStorage";

export function DashboardsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { engine, dataset, loadingMessage } =
    useOutletContext<WorkspaceDataset>();
  const dashboards = useLiveQuery(() =>
    workspaceDb.dashboards
      .orderBy("createdAt")
      .reverse()
      .toArray()
      .catch(() => null),
  );
  const selected =
    dashboards?.find(({ id }) => id === searchParams.get("dashboard")) ??
    dashboards?.[0];

  function selectDashboard(id: string) {
    setSearchParams({ dashboard: id }, { replace: true });
  }

  const newDashboard = (
    <DashboardNameDialog
      action="New dashboard"
      label="Dashboard name"
      onSave={async (title) => selectDashboard(await createDashboard(title))}
    />
  );

  return (
    <WorkspacePage title="Dashboards" actions={selected && newDashboard}>
      {dashboards === undefined ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading dashboards…
        </p>
      ) : dashboards === null ? (
        <p role="alert" className="text-sm text-destructive">
          Could not read saved dashboards. Check browser storage and reload.
        </p>
      ) : selected ? (
        <>
          <div className="flex flex-wrap items-end gap-2 border-b border-panel-border pb-4">
            <SelectField
              label="Dashboard"
              options={dashboards.map(({ id, title }) => ({
                value: id,
                label: title,
              }))}
              value={selected.id}
              onChange={selectDashboard}
              className="w-full sm:w-72"
            />
            <DashboardNameDialog
              action="Rename dashboard"
              label="Dashboard name"
              initialName={selected.title}
              onSave={async (title) => {
                const updated = await workspaceDb.dashboards.update(
                  selected.id,
                  { title },
                );
                if (!updated)
                  throw new Error("This dashboard is no longer available.");
              }}
            />
            <ConfirmAction
              key={selected.id}
              action="Delete dashboard"
              ariaLabel={`Delete dashboard ${selected.title}`}
              title="Delete dashboard?"
              description={
                <>
                  <strong className="wrap-anywhere font-semibold text-popover-foreground">
                    “{selected.title}”
                  </strong>{" "}
                  and all of its pinned charts will be removed from this
                  browser.
                </>
              }
              disabled={false}
              onConfirm={async () => {
                await deleteDashboard(selected.id);
                setSearchParams({}, { replace: true });
              }}
            />
          </div>

          <DashboardChartGrid
            key={selected.id}
            dashboardId={selected.id}
            focusedChartId={searchParams.get("chart")}
            engine={engine}
            activeDataset={dataset}
            waitingForWorkspace={Boolean(loadingMessage)}
          />
        </>
      ) : (
        <WorkspaceEmptyState
          icon={LayoutDashboard}
          title="No saved dashboards"
          description="Create a dashboard to collect your charts, or pin an analysis directly from Chart Studio."
        >
          {newDashboard}
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="../charts" />}
          >
            Open Chart Studio
          </Button>
        </WorkspaceEmptyState>
      )}
    </WorkspacePage>
  );
}
