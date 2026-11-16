import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { Dataset, WorkspaceDataset } from "@/types/dataset";
import sampleSales from "@/features/datasets/sample-sales.csv?raw";
import { createDuckDB } from "@/lib/duckdb/createDuckDB";

type ImportResult = {
  dataset: Dataset | null;
  error: string | null;
};

function createSampleFile() {
  return new File([sampleSales], "sample-sales.csv", { type: "text/csv" });
}

export function useWorkspaceDataset(): WorkspaceDataset {
  const [searchParams, setSearchParams] = useSearchParams();
  const [importingFile, setImportingFile] = useState<File | null>(() =>
    searchParams.get("sample") === "1" ? createSampleFile() : null,
  );
  const [result, setResult] = useState<ImportResult | null>(null);
  const [engine] = useState(() =>
    createDuckDB((error) => setResult({ dataset: null, error: error.message })),
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

        const dataset = await importDataset(engine, file);
        if (isCurrent) setResult({ dataset, error: null });
      } catch (error) {
        if (!isCurrent) return;

        const message =
          error instanceof Error
            ? error.message
            : "Try opening the file again.";
        setResult((previous) => ({
          dataset: previous?.dataset ?? null,
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
    dataset: result?.dataset ?? null,
    error: importingFile ? null : (result?.error ?? null),
    openFile,
    openSample: () => openFile(createSampleFile()),
  };
}
