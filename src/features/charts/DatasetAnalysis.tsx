import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/SelectField";
import type { DuckDBEngine } from "@/lib/duckdb/createDuckDB";
import { saveAnalysis } from "@/lib/workspaceDb";
import type {
  AnalysisConversation,
  AnalysisPlan,
  AnalysisResult,
  CompiledAnalysis,
  PendingClarification,
  SavedAnalysis,
} from "@/types/analysis";
import type { Dataset } from "@/types/dataset";
import { maxClarificationTurns } from "./analysisApiSchema";
import { AnalysisOutput } from "./AnalysisOutput";
import { analysisPresets } from "./analysisPresets";
import { compileAnalysisPlan } from "./compileAnalysisPlan";
import { requestAnalysis } from "./requestAnalysis";
import { runAnalysis } from "./runAnalysis";
import { AskAnalysisForm } from "./AskAnalysisForm";
import { RecentAnalyses } from "./RecentAnalyses";
import { ManualChartForm } from "./ManualChartForm";

const ResultExplanation = lazy(() => import("./ResultExplanation"));

type AnalysisTask =
  | { source: "ai"; conversation: AnalysisConversation }
  | { source: "preset" | "manual"; title: string; compiled: CompiledAnalysis }
  | { source: "saved"; analysis: SavedAnalysis };

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
  const builderId = useId();
  const assistantId = useId();
  const resultId = useId();
  const request = useRef<AbortController | null>(null);
  const builderRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const assistantRef = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState<{
    revision: number;
    title: string;
    plan: AnalysisPlan;
  }>();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [saveWarning, setSaveWarning] = useState(false);
  const [followUp, setFollowUp] = useState<PendingClarification | null>(null);
  const [output, setOutput] = useState<{
    version: number;
    source: AnalysisTask["source"];
    question: string | null;
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
  const [isBuilderOpen, setIsBuilderOpen] = useState(!preset);
  const busy = status?.phase === "planning" || status?.phase === "running";
  const assistantStatus = status?.source === "ai" ? status : null;

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (output && output.source !== "ai") resultRef.current?.focus();
  }, [output]);

  async function analyze(task: AnalysisTask) {
    if (
      request.current ||
      (task.source === "saved" && task.analysis.datasetId !== dataset.id)
    )
      return;

    const controller = new AbortController();
    request.current = controller;
    const { signal } = controller;
    const { source } = task;
    let phase: "planning" | "running" =
      source === "ai" ? "planning" : "running";
    setStatus({ source, phase });
    setSaveWarning(false);

    try {
      let title: string;
      let compiled: CompiledAnalysis;
      let question: string | null = null;
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
        question = conversation.question;
        compiled = compileAnalysisPlan(reply.plan, dataset.columns);
      } else if (task.source === "saved") {
        const { analysis } = task;
        title = analysis.title;
        question = analysis.question;
        compiled = compileAnalysisPlan(analysis.plan, dataset.columns);
      } else {
        ({ title, compiled } = task);
      }

      phase = "running";
      setStatus({ source, phase });
      const result = await runAnalysis(engine, compiled);
      signal.throwIfAborted();
      setOutput((previous) => ({
        version: (previous?.version ?? 0) + 1,
        source,
        question,
        title,
        result,
      }));
      if (source === "ai") setFollowUp(null);
      if (source !== "saved") {
        try {
          await saveAnalysis({
            datasetId: dataset.id,
            title,
            question,
            plan: result.plan,
            createdAt: Date.now(),
          });
        } catch {
          if (!signal.aborted) setSaveWarning(true);
        }
      }
      if (!signal.aborted)
        setStatus(source === "ai" ? { source, phase: "done" } : null);
    } catch (error) {
      if (!signal.aborted) {
        const message =
          phase === "planning" && error instanceof Error
            ? error.message
            : source === "saved"
              ? "Could not rerun this saved analysis. Check the dataset columns or start a new analysis."
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
    <div className="grid min-w-0 gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 wrap-break-word text-sm">
          <span className="text-muted-foreground">Active dataset </span>
          <strong className="font-medium">{dataset.name}</strong>
        </p>
        <Button
          type="button"
          variant={isAssistantOpen ? "outline" : "default"}
          size="lg"
          className="gap-2 px-3.5"
          aria-expanded={isAssistantOpen}
          aria-controls={assistantId}
          onClick={() => {
            setIsAssistantOpen(!isAssistantOpen);
            if (!isAssistantOpen) {
              requestAnimationFrame(() => assistantRef.current?.focus());
            }
          }}
        >
          {!isAssistantOpen && <Sparkles aria-hidden="true" />}
          {isAssistantOpen ? "Hide assistant" : "Ask AI"}
        </Button>
      </div>

      <div
        className={
          isAssistantOpen
            ? "grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"
            : "grid min-w-0 gap-5"
        }
      >
        <div className="grid min-w-0 gap-5">
          {preset && (
            <section
              className="grid gap-3 rounded-xl border p-4"
              aria-label="Local analysis presets"
            >
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
                <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,21rem)_auto] sm:justify-start">
                  <SelectField
                    label="Analysis preset"
                    value={String(selection)}
                    disabled={busy}
                    options={presets.map(({ title, compiled }, index) => ({
                      value: String(index),
                      label: title,
                      disabled: !compiled,
                    }))}
                    onChange={(value) => {
                      setSelection(Number(value));
                      if (status?.source === "preset") setStatus(null);
                    }}
                  />
                  <Button
                    type="submit"
                    className="h-9 justify-self-start"
                    disabled={busy}
                  >
                    Run analysis
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {preset.description}
                </p>
              </form>
              {status?.source === "preset" && (
                <AnalysisStatusMessage status={status} />
              )}
            </section>
          )}

          {output && (
            <div
              ref={resultRef}
              id={resultId}
              tabIndex={-1}
              className="min-w-0 scroll-mt-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <AnalysisOutput
                title={output.title}
                result={output.result}
                actions={
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setEditing((current) => ({
                        revision: (current?.revision ?? 0) + 1,
                        title: output.title,
                        plan: output.result.plan,
                      }));
                      setIsBuilderOpen(true);
                      builderRef.current?.focus();
                    }}
                  >
                    Edit chart
                  </Button>
                }
              />
            </div>
          )}

          <section
            aria-label="Build a chart"
            className="@container min-w-0 rounded-xl border"
          >
            <h2>
              <button
                ref={builderRef}
                type="button"
                aria-expanded={isBuilderOpen}
                aria-controls={builderId}
                onClick={() => setIsBuilderOpen((open) => !open)}
                className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Build a chart
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground group-aria-expanded:rotate-180"
                />
              </button>
            </h2>
            <div id={builderId} hidden={!isBuilderOpen}>
              <div className="grid gap-3 border-t p-4">
                <ManualChartForm
                  key={editing?.revision}
                  columns={dataset.columns}
                  initial={editing}
                  busy={busy}
                  onBuild={(title, compiled) =>
                    void analyze({ source: "manual", title, compiled })
                  }
                />
                {status?.source === "manual" && (
                  <AnalysisStatusMessage status={status} />
                )}
              </div>
            </div>
          </section>

          {saveWarning && (
            <p role="status" className="text-sm text-muted-foreground">
              The chart is ready, but its analysis could not be saved in this
              browser.
            </p>
          )}
        </div>

        <aside
          id={assistantId}
          ref={assistantRef}
          tabIndex={-1}
          hidden={!isAssistantOpen}
          aria-label="Ask2Chart Assistant"
          className="min-w-0 space-y-4 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
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
          {output && output.result.rows.length > 0 && (
            <Suspense fallback={null}>
              <ResultExplanation
                key={output.version}
                title={output.title}
                question={output.question}
                result={output.result}
                disabled={busy}
              />
            </Suspense>
          )}
        </aside>
      </div>

      <RecentAnalyses
        datasetId={dataset.id}
        disabled={busy}
        onRun={(analysis) => void analyze({ source: "saved", analysis })}
      />
      {status?.source === "saved" && <AnalysisStatusMessage status={status} />}
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
