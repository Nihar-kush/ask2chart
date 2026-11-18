import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult, ExplanationRequest } from "@/types/analysis";
import { getAnalysisLabels } from "./analysisLabels";
import { ExplanationConsent } from "./ExplanationConsent";
import {
  maxExplanationGroups,
  maxExplanationLabelLength,
} from "./explanationSchema";
import { requestExplanation } from "./requestExplanation";

type ExplanationState =
  | { phase: "idle" | "streaming" | "done" | "stopped"; text: string }
  | { phase: "error"; text: string; message: string };

function shortenLabel(label: string) {
  return label.length > maxExplanationLabelLength
    ? `${label.slice(0, maxExplanationLabelLength - 1)}…`
    : label;
}

export default function ResultExplanation({
  title,
  question,
  result,
  disabled,
}: {
  title: string;
  question: string | null;
  result: AnalysisResult;
  disabled: boolean;
}) {
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<ExplanationState>({
    phase: "idle",
    text: "",
  });
  const [payload] = useState<ExplanationRequest>(() => {
    const { groupLabel, metricLabel } = getAnalysisLabels(result.plan);
    return {
      title,
      question,
      groupLabel: shortenLabel(groupLabel),
      metricLabel: shortenLabel(metricLabel),
      chartType: result.plan.chart,
      aggregation: result.plan.metric.aggregation,
      chartLimit: result.plan.limit,
      metricSort:
        result.plan.sort.by === "metric"
          ? result.plan.sort.direction
          : undefined,
      groupByMonth: result.plan.groupBy.bucket === "month",
      resultGroupCount: result.rows.length,
      rows: result.rows
        .slice(0, maxExplanationGroups)
        .map(({ group, value }) => ({
          group: shortenLabel(group),
          value,
        })),
    };
  });

  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );

  async function explain() {
    if (disabled || request.current) return;

    const controller = new AbortController();
    request.current = controller;
    let text = "";
    let frame: number | undefined;
    setState({ phase: "streaming", text });

    try {
      await requestExplanation(payload, controller.signal, (delta) => {
        text += delta;
        if (frame === undefined) {
          frame = window.requestAnimationFrame(() => {
            frame = undefined;
            if (request.current === controller && !controller.signal.aborted) {
              setState({ phase: "streaming", text });
            }
          });
        }
      });
      controller.signal.throwIfAborted();
      if (request.current === controller) setState({ phase: "done", text });
    } catch (error) {
      if (request.current !== controller) return;

      if (controller.signal.aborted) {
        setState({ phase: "stopped", text });
      } else {
        setState({
          phase: "error",
          text,
          message:
            error instanceof Error
              ? error.message
              : "Could not explain this result. Try again.",
        });
      }
    } finally {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (request.current === controller) request.current = null;
    }
  }

  const status =
    state.phase === "streaming"
      ? "Explaining result…"
      : state.phase === "done"
        ? "Explanation ready."
        : state.phase === "stopped"
          ? "Explanation stopped."
          : "";

  return (
    <section
      aria-label="Result explanation"
      className="grid min-w-0 justify-items-start gap-3 rounded-xl border p-4"
    >
      <h2 className="text-sm font-semibold">Result explanation</h2>
      {state.phase === "idle" && (
        <ExplanationConsent
          payload={payload}
          disabled={disabled}
          onApprove={() => void explain()}
        />
      )}
      {state.text && (
        <p className="whitespace-pre-wrap wrap-break-word text-sm">
          {state.text}
        </p>
      )}
      <p
        role="status"
        className={
          status && state.phase !== "done"
            ? "text-sm text-muted-foreground"
            : "sr-only"
        }
      >
        {status}
      </p>
      {state.phase === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      {state.phase === "streaming" && (
        <Button variant="outline" onClick={() => request.current?.abort()}>
          Stop explanation
        </Button>
      )}
      {(state.phase === "error" || state.phase === "stopped") && (
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => void explain()}
        >
          Retry explanation
        </Button>
      )}
    </section>
  );
}
