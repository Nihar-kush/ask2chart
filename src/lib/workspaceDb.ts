import Dexie, { type EntityTable } from "dexie";
import type { SavedAnalysis } from "@/types/analysis";
import type { Dashboard, DashboardChart } from "@/types/dashboard";
import type { Dataset, SavedDataset } from "@/types/dataset";

const workspaceId = "default";
export const sampleDatasetId = "sample-sales";

export const workspaceDb = new Dexie("ask2chart") as Dexie & {
  workspaces: EntityTable<{ id: string; activeDatasetId: string }, "id">;
  datasets: EntityTable<SavedDataset, "id">;
  datasetFiles: EntityTable<{ id: string; blob: Blob }, "id">;
  analyses: EntityTable<SavedAnalysis, "id">;
  dashboards: EntityTable<Dashboard, "id">;
  dashboardCharts: EntityTable<DashboardChart, "id">;
};

workspaceDb.version(1).stores({
  workspaces: "id",
  datasets: "id, addedAt",
  datasetFiles: "id",
  analyses: "++id, [datasetId+createdAt]",
});

workspaceDb.version(2).stores({
  dashboards: "id, createdAt",
  dashboardCharts: "id, dashboardId, datasetId",
});

export function analysisHistory(datasetId: string) {
  return workspaceDb.analyses
    .where("[datasetId+createdAt]")
    .between([datasetId, 0], [datasetId, Number.MAX_SAFE_INTEGER]);
}

export async function deleteDataset(id: string) {
  if (id === sampleDatasetId) {
    throw new Error("The built-in sample dataset cannot be deleted.");
  }

  await workspaceDb.transaction(
    "rw",
    workspaceDb.workspaces,
    workspaceDb.datasets,
    workspaceDb.datasetFiles,
    workspaceDb.analyses,
    workspaceDb.dashboardCharts,
    async () => {
      const selection = await workspaceDb.workspaces.get(workspaceId);
      if (selection?.activeDatasetId === id) {
        await workspaceDb.workspaces.delete(workspaceId);
      }
      await analysisHistory(id).delete();
      await workspaceDb.dashboardCharts.where("datasetId").equals(id).delete();
      await workspaceDb.datasetFiles.delete(id);
      await workspaceDb.datasets.delete(id);
    },
  );
}

export async function readSavedDataset(id?: string) {
  return workspaceDb.transaction(
    "r",
    workspaceDb.workspaces,
    workspaceDb.datasets,
    workspaceDb.datasetFiles,
    async () => {
      const datasetId =
        id ?? (await workspaceDb.workspaces.get(workspaceId))?.activeDatasetId;
      if (!datasetId) return null;

      const metadata = await workspaceDb.datasets.get(datasetId);
      const file = await workspaceDb.datasetFiles.get(datasetId);
      if (!metadata || !file?.blob.size) {
        throw new Error(
          "The saved CSV is missing. Open the original file or choose another dataset.",
        );
      }

      return {
        id: datasetId,
        file: new File([file.blob], metadata.name, { type: file.blob.type }),
      };
    },
  );
}

export async function saveActiveDataset(dataset: Dataset, file?: File) {
  const selection = { id: workspaceId, activeDatasetId: dataset.id };
  if (!file) {
    await workspaceDb.transaction(
      "rw",
      workspaceDb.datasets,
      workspaceDb.workspaces,
      async () => {
        if (!(await workspaceDb.datasets.get(dataset.id))) {
          throw new Error(
            "This dataset was removed. Open the original CSV again.",
          );
        }
        await workspaceDb.workspaces.put(selection);
      },
    );
    return;
  }

  const { id, name, columns, rowCount } = dataset;
  await workspaceDb.transaction(
    "rw",
    workspaceDb.datasets,
    workspaceDb.datasetFiles,
    workspaceDb.workspaces,
    async () => {
      const existing = await workspaceDb.datasets.get(id);
      await workspaceDb.datasets.put({
        id,
        name,
        columns,
        rowCount,
        addedAt: existing?.addedAt ?? Date.now(),
      });
      await workspaceDb.datasetFiles.put({ id, blob: file });
      await workspaceDb.workspaces.put(selection);
    },
  );
}

export async function saveAnalysis(analysis: Omit<SavedAnalysis, "id">) {
  await workspaceDb.transaction(
    "rw",
    workspaceDb.datasets,
    workspaceDb.analyses,
    async () => {
      if (!(await workspaceDb.datasets.get(analysis.datasetId))) {
        throw new Error("Save the dataset before saving its analyses.");
      }
      await workspaceDb.analyses.add(analysis);
    },
  );
}
