import { useOutletContext } from "react-router";
import type { WorkspaceDataset } from "./useWorkspaceDataset";

export function WorkspaceOverview() {
  const { preview, importingFile } = useOutletContext<WorkspaceDataset>();
  const status = importingFile
    ? `Importing ${importingFile.name}…`
    : (preview?.name ?? "No dataset selected.");

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
