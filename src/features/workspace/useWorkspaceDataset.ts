import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { Dataset, SavedDataset, WorkspaceDataset } from "@/types/dataset";
import sampleSales from "@/features/datasets/sample-sales.csv?raw";
import { createDuckDB } from "@/lib/duckdb/createDuckDB";
import {
  deleteDataset,
  readSavedDataset,
  sampleDatasetId,
  saveActiveDataset,
} from "@/lib/workspaceDb";

type DatasetRequest =
  | { kind: "restore" }
  | { kind: "saved"; id: string; name: string }
  | { kind: "import"; id: string; file: File };

function sampleRequest(): DatasetRequest {
  return {
    kind: "import",
    id: sampleDatasetId,
    file: new File([sampleSales], "sample-sales.csv", { type: "text/csv" }),
  };
}

export function useWorkspaceDataset(): WorkspaceDataset {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pending, setPending] = useState<DatasetRequest | null>(() =>
    searchParams.get("sample") === "1" ? sampleRequest() : { kind: "restore" },
  );
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [engine] = useState(() =>
    createDuckDB((failure) => {
      setDataset(null);
      setError(failure.message);
    }),
  );

  useEffect(() => () => engine.dispose(), [engine]);

  useEffect(() => {
    if (!pending) return;
    let current = true;

    async function load(request: DatasetRequest) {
      try {
        const source =
          request.kind === "import"
            ? request
            : await readSavedDataset(
                request.kind === "saved" ? request.id : undefined,
              );
        if (!current || !source) return;

        const { importDataset } =
          await import("@/features/datasets/importDataset");
        if (!current) return;

        const loaded = await importDataset(engine, source.file, source.id);
        if (!current) return;

        let warning = null;
        if (request.kind !== "restore") {
          try {
            await saveActiveDataset(
              loaded,
              request.kind === "import" ? request.file : undefined,
            );
          } catch {
            warning =
              "This CSV is open, but the workspace could not save it as the active dataset. Check browser storage before reloading.";
          }
        }
        if (!current) return;
        setDataset(loaded);
        setError(null);
        setStorageWarning(warning);
      } catch (failure) {
        if (!current) return;
        const message =
          failure instanceof Error ? failure.message.split("\n", 1)[0] : "";
        setError(
          request.kind === "import"
            ? message || "Could not import the CSV. Try opening it again."
            : "Could not restore the saved dataset. Choose a saved dataset or open the original CSV again.",
        );
      } finally {
        if (current) setPending(null);
      }
    }

    void load(pending);
    return () => {
      current = false;
    };
  }, [engine, pending]);

  function clearSampleParam() {
    if (!searchParams.has("sample")) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("sample");
    setSearchParams(nextParams, { replace: true });
  }

  function open(request: DatasetRequest) {
    if (pending || deleting) return;

    clearSampleParam();
    setPending(request);
  }

  async function deleteSaved(id: string) {
    if (pending || deleting) throw new Error("The workspace is busy.");
    setDeleting(true);
    try {
      await deleteDataset(id);
      if (dataset?.id === id) {
        clearSampleParam();
        engine.dispose();
        setDataset(null);
        setError(null);
        setStorageWarning(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  const loadingMessage =
    pending?.kind === "restore"
      ? "Setting up your workspace…"
      : pending?.kind === "saved"
        ? `Opening ${pending.name}…`
        : pending?.kind === "import"
          ? `Importing ${pending.file.name}…`
          : null;

  return {
    engine,
    dataset,
    isRestoring: pending?.kind === "restore",
    loadingMessage,
    error: pending ? null : error,
    storageWarning: pending ? null : storageWarning,
    openFile: (file: File) =>
      open({ kind: "import", id: crypto.randomUUID(), file }),
    openSample: () => open(sampleRequest()),
    openSaved: ({ id, name }: SavedDataset) =>
      open({ kind: "saved", id, name }),
    deleteSaved,
  };
}
