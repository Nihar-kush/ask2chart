import { workspaceDb } from "@/lib/workspaceDb";
import type { DashboardChart } from "@/types/dashboard";

export async function createDashboard(title: string) {
  const id = crypto.randomUUID();
  await workspaceDb.dashboards.add({ id, title, createdAt: Date.now() });
  return id;
}

export async function pinChart(
  dashboard: { id: string } | { title: string },
  chart: Pick<DashboardChart, "datasetId" | "title" | "plan">,
) {
  return workspaceDb.transaction(
    "rw",
    workspaceDb.datasets,
    workspaceDb.dashboards,
    workspaceDb.dashboardCharts,
    async () => {
      if (!(await workspaceDb.datasets.get(chart.datasetId))) {
        throw new Error("Save the source CSV before pinning this chart.");
      }

      let dashboardId: string;
      if ("id" in dashboard) {
        if (!(await workspaceDb.dashboards.get(dashboard.id))) {
          throw new Error("This dashboard was removed. Choose another one.");
        }
        dashboardId = dashboard.id;
      } else {
        dashboardId = await createDashboard(dashboard.title);
      }

      await workspaceDb.dashboardCharts.add({
        ...chart,
        dashboardId,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      });
      return dashboardId;
    },
  );
}
