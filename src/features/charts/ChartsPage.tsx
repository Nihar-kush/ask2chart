import { useId, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";
import type { AnalysisResult } from "@/types/analysis";
import type { Dataset, WorkspaceDataset } from "@/types/dataset";
import { AnalysisOutput } from "./AnalysisOutput";
import { analysisPresets } from "./analysisPresets";
import { compileAnalysisPlan } from "./compileAnalysisPlan";
import { runAnalysis } from "./runAnalysis";

export function ChartsPage() {
  const { engine, dataset, importingFile, error, openSample } =
    useOutletContext<WorkspaceDataset>();

  return (
    <div className="grid min-w-0 gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Chart Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Run a preset analysis on your active dataset.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={Boolean(importingFile)}
          onClick={openSample}
        >
          Try sample data
        </Button>
      </header>

      {importingFile && (
        <p
          role="status"
          className="wrap-break-word text-sm text-muted-foreground"
        >
          Importing {importingFile.name}…
        </p>
      )}
      {error && (
        <p role="alert" className="wrap-break-word text-sm text-destructive">
          {error}
        </p>
      )}
      {!importingFile &&
        (dataset ? (
          <PresetAnalysis key={dataset.id} dataset={dataset} engine={engine} />
        ) : (
          <section className="grid justify-items-start gap-3 rounded-xl border p-5">
            <h2 className="font-semibold">Choose a dataset to get started</h2>
            <p className="text-sm text-muted-foreground">
              Load the sample sales CSV or open an existing CSV in Data
              Explorer.
            </p>
            <Link
              to="/workspace/datasets"
              className="text-sm font-medium underline underline-offset-4 focus-visible:outline-2"
            >
              Open Data Explorer
            </Link>
          </section>
        ))}
    </div>
  );
}

function PresetAnalysis({
  dataset,
  engine,
}: {
  dataset: Dataset;
  engine: DuckDBEngine;
}) {
  const presetId = useId();
  const presets = useMemo(
    () =>
      analysisPresets.map((preset) => {
        try {
          return {
            ...preset,
            compiled: compileAnalysisPlan(preset.plan, dataset.columns),
          };
        } catch {
          return { ...preset, compiled: null };
        }
      }),
    [dataset.columns],
  );

  const [selection, setSelection] = useState(() =>
    presets.findIndex((preset) => preset.compiled),
  );
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preset = presets[selection];

  async function analyze() {
    if (!preset?.compiled || isRunning) return;

    setError(null);
    setResult(null);
    setIsRunning(true);
    try {
      setResult(await runAnalysis(engine, preset.compiled));
    } catch {
      setError("Could not run this analysis. Try running it again.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      <section className="grid gap-3 rounded-xl border p-4">
        <p className="wrap-break-word text-sm">
          <span className="text-muted-foreground">Active dataset </span>
          <strong className="font-medium">{dataset.name}</strong>
        </p>
        {preset ? (
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void analyze();
            }}
          >
            <label htmlFor={presetId} className="text-sm font-medium">
              Analysis preset
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                id={presetId}
                value={selection}
                disabled={isRunning}
                onChange={(event) => {
                  setSelection(Number(event.target.value));
                  setResult(null);
                  setError(null);
                }}
                className="h-8 min-w-0 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2"
              >
                {presets.map(({ title, compiled }, index) => (
                  <option key={title} value={index} disabled={!compiled}>
                    {title}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={isRunning}>
                {isRunning ? "Running…" : "Run analysis"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {preset.description}
            </p>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            These presets need a numeric revenue column and either category or
            order_date. Load the sample sales CSV to try them.
          </p>
        )}
      </section>

      {isRunning && (
        <p role="status" className="text-sm text-muted-foreground">
          Running query…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && preset && (
        <AnalysisOutput title={preset.title} result={result} />
      )}
    </div>
  );
}
