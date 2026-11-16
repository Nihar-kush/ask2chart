import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";
import type {
  AnalysisConversation,
  AnalysisResult,
  CompiledAnalysis,
  PendingClarification,
} from "@/types/analysis";
import type { Dataset } from "@/types/dataset";
import { maxClarificationTurns } from "./analysisApiSchema";
import { AnalysisOutput } from "./AnalysisOutput";
import { analysisPresets } from "./analysisPresets";
import { compileAnalysisPlan } from "./compileAnalysisPlan";
import { requestAnalysis } from "./requestAnalysis";
import { runAnalysis } from "./runAnalysis";
import { AskAnalysisForm } from "./AskAnalysisForm";

type AnalysisTask =
  | { source: "ai"; conversation: AnalysisConversation }
  | { source: "preset"; title: string; compiled: CompiledAnalysis };

type AnalysisStatus = { source: AnalysisTask["source"] } & (
  | { phase: "planning" | "running" | "done" }
  | { phase: "error" | "notice"; message: string }
);

export function DatasetAnalysis({
  dataset,
  engine,
}: {
  dataset: Dataset;
  engine: DuckDBEngine;
}) {
  const presetId = useId();
  const assistantId = useId();
  const resultId = useId();
  const request = useRef<AbortController | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [followUp, setFollowUp] = useState<PendingClarification | null>(null);
  const [output, setOutput] = useState<{
    title: string;
    result: AnalysisResult;
  } | null>(null);
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
  const preset = presets[selection];
  const busy = status?.phase === "planning" || status?.phase === "running";
  const assistantStatus = status?.source === "ai" ? status : null;

  useEffect(() => () => request.current?.abort(), []);

  async function analyze(task: AnalysisTask) {
    if (request.current) return;

    const controller = new AbortController();
    request.current = controller;
    const { signal } = controller;
    const { source } = task;
    let phase: "planning" | "running" =
      source === "ai" ? "planning" : "running";
    setStatus({ source, phase });

    try {
      let title: string;
      let compiled: CompiledAnalysis;
      if (task.source === "ai") {
        const { conversation } = task;
        const reply = await requestAnalysis(
          conversation,
          dataset.columns,
          signal,
        );
        signal.throwIfAborted();
        if (reply.kind === "clarification") {
          if (conversation.clarifications.length >= maxClarificationTurns) {
            setStatus({
              source,
              phase: "notice",
              message:
                "The assistant still needs more detail. Try a more specific reply or start a new question.",
            });
            return;
          }
          setFollowUp({ conversation, reply });
          setStatus(null);
          return;
        }
        if (reply.kind === "unsupported") {
          // Keep the follow-up open so the user can try a different reply
          setStatus({ source, phase: "notice", message: reply.message });
          return;
        }
        title = reply.title;
        compiled = compileAnalysisPlan(reply.plan, dataset.columns);
      } else {
        ({ title, compiled } = task);
      }

      phase = "running";
      setStatus({ source, phase });
      const result = await runAnalysis(engine, compiled);
      signal.throwIfAborted();
      setOutput({ title, result });
      if (source === "ai") setFollowUp(null);
      setStatus(source === "ai" ? { source, phase: "done" } : null);
    } catch (error) {
      if (!signal.aborted) {
        const message =
          phase === "planning" && error instanceof Error
            ? error.message
            : "Could not run this analysis. Try again.";
        setStatus({ source, phase: "error", message });
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  function ask(value: string) {
    const conversation = followUp
      ? {
          question: followUp.conversation.question,
          clarifications: [
            ...followUp.conversation.clarifications,
            { question: followUp.reply.message, answer: value },
          ],
        }
      : { question: value, clarifications: [] };
    void analyze({ source: "ai", conversation });
  }

  function startOver() {
    setFollowUp(null);
    if (assistantStatus) setStatus(null);
  }

  function cancelPlan() {
    request.current?.abort();
    request.current = null;
    setStatus({ source: "ai", phase: "notice", message: "Request cancelled." });
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 wrap-break-word text-sm">
          <span className="text-muted-foreground">Active dataset </span>
          <strong className="font-medium">{dataset.name}</strong>
        </p>
        <Button
          variant="outline"
          aria-expanded={isAssistantOpen}
          aria-controls={assistantId}
          onClick={() => setIsAssistantOpen((open) => !open)}
        >
          {isAssistantOpen ? "Hide assistant" : "Show assistant"}
        </Button>
      </div>

      <div
        className={
          isAssistantOpen
            ? "grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]"
            : "grid min-w-0 gap-4"
        }
      >
        <aside
          id={assistantId}
          hidden={!isAssistantOpen}
          aria-label="Ask2Chart Assistant"
          className="xl:order-last"
        >
          <AskAnalysisForm
            key={followUp?.conversation.clarifications.length ?? "question"}
            followUp={followUp}
            busy={busy}
            isPlanning={assistantStatus?.phase === "planning"}
            isVisible={isAssistantOpen}
            onSubmit={ask}
            onCancel={cancelPlan}
            onStartOver={startOver}
            status={
              assistantStatus?.phase === "done" ? (
                <p role="status" className="text-sm">
                  Chart ready ·{" "}
                  <a
                    className="font-medium underline underline-offset-4"
                    href={`#${resultId}`}
                  >
                    View chart
                  </a>
                </p>
              ) : assistantStatus ? (
                <AnalysisStatusMessage status={assistantStatus} />
              ) : null
            }
          />
        </aside>

        <div className="grid min-w-0 gap-5">
          <section
            className="grid gap-2 rounded-xl border p-4"
            aria-label="Local analysis presets"
          >
            {preset ? (
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (preset.compiled) {
                    void analyze({
                      source: "preset",
                      title: preset.title,
                      compiled: preset.compiled,
                    });
                  }
                }}
              >
                <label htmlFor={presetId} className="text-sm font-medium">
                  Analysis preset
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id={presetId}
                    value={selection}
                    disabled={busy}
                    onChange={(event) => {
                      setSelection(Number(event.target.value));
                      if (status?.source === "preset") setStatus(null);
                    }}
                    className="h-8 min-w-0 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2"
                  >
                    {presets.map(({ title, compiled }, index) => (
                      <option key={title} value={index} disabled={!compiled}>
                        {title}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline" disabled={busy}>
                    Run analysis
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {preset.description}
                </p>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sales presets need a numeric revenue column and either category
                or order_date. Load the sample sales CSV to try them.
              </p>
            )}
            {status?.source === "preset" && (
              <AnalysisStatusMessage status={status} />
            )}
          </section>

          {output && (
            <div id={resultId} tabIndex={-1} className="min-w-0 scroll-mt-4">
              <AnalysisOutput title={output.title} result={output.result} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalysisStatusMessage({ status }: { status: AnalysisStatus }) {
  if (status.phase === "error") {
    return (
      <p role="alert" className="wrap-break-word text-sm text-destructive">
        {status.message}
      </p>
    );
  }

  let message = "Running query in the browser…";
  if (status.phase === "planning") message = "Creating an analysis plan…";
  if (status.phase === "notice") message = status.message;

  return (
    <p role="status" className="wrap-break-word text-sm text-muted-foreground">
      {message}
    </p>
  );
}
