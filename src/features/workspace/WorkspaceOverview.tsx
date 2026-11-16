import { useOutletContext } from "react-router";
import type { WorkspaceDataset } from "@/types/dataset";

export function WorkspaceOverview() {
  const { dataset, importingFile } = useOutletContext<WorkspaceDataset>();
  const status = importingFile
    ? `Importing ${importingFile.name}…`
    : (dataset?.name ?? "No dataset selected.");

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
      <p
        role="status"
        className="mt-2 wrap-break-word text-sm text-muted-foreground"
      >
        {status}
      </p>
    </>
  );
}
