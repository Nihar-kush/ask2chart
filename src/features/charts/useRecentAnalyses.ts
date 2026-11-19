import { useLiveQuery } from "dexie-react-hooks";
import { analysisHistory } from "@/lib/workspaceDb";

export const analysisDateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

export function useRecentAnalyses(datasetId: string, limit: number) {
  return useLiveQuery(
    () =>
      analysisHistory(datasetId)
        .reverse()
        .limit(limit)
        .toArray()
        .catch(() => null),
    [datasetId, limit],
  );
}
