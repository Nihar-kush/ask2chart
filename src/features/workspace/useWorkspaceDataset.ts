import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { DatasetPreview } from "@/features/datasets/importDataset";
import sampleSales from "@/features/datasets/sample-sales.csv?raw";
import { createDuckDB } from "@/lib/duckdb/createDuckDB";

type ImportResult = {
  preview: DatasetPreview | null;
  error: string | null;
};

function createSampleFile() {
  return new File([sampleSales], "sample-sales.csv", { type: "text/csv" });
}

export function useWorkspaceDataset() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [importingFile, setImportingFile] = useState<File | null>(() =>
    searchParams.get("sample") === "1" ? createSampleFile() : null,
  );
  const [result, setResult] = useState<ImportResult | null>(null);
  const [engine] = useState(() =>
    createDuckDB((error) => setResult({ preview: null, error: error.message })),
  );

  useEffect(() => () => engine.dispose(), [engine]);

  useEffect(() => {
    if (!importingFile) return;

    let isCurrent = true;

    async function load(file: File) {
      try {
        const { importDataset } =
          await import("@/features/datasets/importDataset");
        if (!isCurrent) return;

        const preview = await importDataset(engine, file);
        if (isCurrent) setResult({ preview, error: null });
      } catch (error) {
        if (!isCurrent) return;

        const message =
          error instanceof Error
            ? error.message
            : "Try opening the file again.";
        setResult((previous) => ({
          preview: previous?.preview ?? null,
          error: message.split("\n", 1)[0],
        }));
      } finally {
        if (isCurrent) setImportingFile(null);
      }
    }

    void load(importingFile);
    return () => {
      isCurrent = false;
    };
  }, [engine, importingFile]);

  function openFile(file: File) {
    if (importingFile) return;

    if (searchParams.has("sample")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("sample");
      setSearchParams(nextParams, { replace: true });
    }
    setImportingFile(file);
  }

  return {
    engine,
    importingFile,
    preview: result?.preview ?? null,
    error: importingFile ? null : (result?.error ?? null),
    openFile,
    openSample: () => openFile(createSampleFile()),
  };
}

export type WorkspaceDataset = ReturnType<typeof useWorkspaceDataset>;
