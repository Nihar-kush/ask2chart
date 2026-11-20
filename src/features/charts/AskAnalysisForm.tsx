import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowRight, ArrowUp, Sparkles } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { PendingClarification } from "@/types/analysis";
import type { DatasetColumn } from "@/types/dataset";
import { maxQuestionLength, maxReplyLength } from "./analysisApiSchema";
import { isDateColumn, isNumericColumn } from "./compileAnalysisPlan";

type AskAnalysisFormProps = {
  columns: DatasetColumn[];
  initialDraft?: string;
  draftOnly?: boolean;
  followUp?: PendingClarification | null;
  status?: ReactNode;
  busy?: boolean;
  isPlanning?: boolean;
  isVisible?: boolean;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
  onStartOver?: () => void;
};

function columnPhrase(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function suggestedQuestions(columns: DatasetColumn[]) {
  const metric = columns.find(({ type }) => isNumericColumn(type));
  const date = columns.find(({ type }) => isDateColumn(type));
  const category = columns.find(({ type }) => type === "VARCHAR");
  const metricLabel = metric && columnPhrase(metric.name);
  const categoryLabel = category && columnPhrase(category.name);

  const questions = [];
  if (date) {
    questions.push(
      metricLabel
        ? `How did ${metricLabel} change month to month?`
        : "How many records were there each month?",
    );
  }
  if (categoryLabel) {
    questions.push(
      metricLabel
        ? `How does ${metricLabel} vary by ${categoryLabel}?`
        : `How many records are there for each ${categoryLabel}?`,
    );
  } else if (!date) {
    const label = metricLabel || (columns[0] && columnPhrase(columns[0].name));
    if (label) questions.push(`What are the most common values for ${label}?`);
  }
  return questions.filter((question) => question.length <= maxQuestionLength);
}

export function AskAnalysisForm({
  columns,
  initialDraft = "",
  draftOnly = false,
  followUp = null,
  status,
  busy = false,
  isPlanning = false,
  isVisible = true,
  onSubmit,
  onCancel,
  onStartOver,
}: AskAnalysisFormProps) {
  const inputId = useId();
  const headingId = `${inputId}-heading`;
  const privacyId = `${inputId}-privacy`;
  const promptId = `${inputId}-follow-up`;
  const limitId = `${inputId}-limit`;
  const input = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const suggestions = followUp ? [] : suggestedQuestions(columns);
  const characterLimit = followUp ? maxReplyLength : maxQuestionLength;
  const ActionIcon = draftOnly ? ArrowRight : ArrowUp;
  const actionLabel = draftOnly
    ? "Continue in Chart Studio"
    : followUp
      ? "Send reply"
      : "Ask assistant";

  useLayoutEffect(() => {
    const field = input.current;
    if (!field || !isVisible || CSS.supports("field-sizing", "content")) return;

    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [draft, isVisible]);

  useEffect(() => {
    if (followUp && isVisible) input.current?.focus();
  }, [followUp, isVisible]);

  function send(value: string) {
    const answer = value.trim();
    if (answer && !busy) onSubmit(answer);
  }

  return (
    <form
      aria-labelledby={headingId}
      className={cn(
        "grid min-w-0 content-start gap-4",
        !draftOnly &&
          "assistant-card rounded-xl border bg-card p-4 text-card-foreground sm:p-5",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        send(draft);
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid shrink-0 place-items-center text-muted-foreground",
            draftOnly
              ? "size-8 rounded-md border border-panel-border bg-card"
              : "size-9 rounded-lg bg-background/60",
          )}
        >
          <Sparkles aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </span>
        <h2
          id={headingId}
          className={cn(
            "font-medium",
            draftOnly ? "text-lg tracking-tight" : "text-sm",
          )}
        >
          Ask2Chart Assistant
        </h2>
      </div>

      {followUp && (
        <>
          <details className="border-b pb-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-2">
              Original question
            </summary>
            <p className="mt-2 whitespace-pre-wrap wrap-break-word">
              {followUp.conversation.question}
            </p>
            {followUp.conversation.clarifications.map(
              ({ question, answer }, index) => (
                <dl key={index} className="mt-2 wrap-break-word">
                  <dt>{question}</dt>
                  <dd className="font-medium text-foreground">{answer}</dd>
                </dl>
              ),
            )}
          </details>
          <p id={promptId} className="wrap-break-word text-sm font-medium">
            {followUp.reply.message}
          </p>
          {followUp.reply.choices.length > 0 && (
            <div
              role="group"
              aria-label="Suggested replies"
              className="grid gap-2"
            >
              {[...new Set(followUp.reply.choices)].map((choice) => (
                <Button
                  key={choice}
                  type="button"
                  variant="outline"
                  disabled={busy}
                  className="h-auto min-h-8 justify-start py-1.5 text-left wrap-break-word whitespace-normal"
                  onClick={() => {
                    setDraft(choice);
                    send(choice);
                  }}
                >
                  {choice}
                </Button>
              ))}
            </div>
          )}
        </>
      )}

      <div
        className={cn(
          "flex min-w-0 items-end gap-1 rounded-xl border border-input",
          draftOnly ? "bg-card p-2.5" : "bg-background p-1.5",
        )}
      >
        <label htmlFor={inputId} className="sr-only">
          {followUp ? "Your reply" : "Your question"}
        </label>
        <textarea
          id={inputId}
          ref={input}
          aria-describedby={
            draftOnly
              ? limitId
              : followUp
                ? `${promptId} ${privacyId} ${limitId}`
                : `${privacyId} ${limitId}`
          }
          rows={1}
          maxLength={characterLimit}
          value={draft}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={followUp ? "Type your answer…" : "Ask about your data…"}
          className={cn(
            "assistant-input max-h-48 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2 text-base outline-none sm:text-sm",
            draftOnly ? "min-h-16" : "min-h-10",
          )}
        />
        <Button
          type="submit"
          aria-label={actionLabel}
          title={draftOnly ? actionLabel : undefined}
          disabled={busy || !draft.trim()}
          size="icon-sm"
          className="rounded-full p-0 transition-colors max-sm:size-8"
        >
          <ActionIcon aria-hidden="true" className="size-3.5" />
        </Button>
      </div>
      <div className="-mt-2.5 flex flex-wrap items-start justify-end gap-x-4 gap-y-1 text-xs leading-relaxed text-muted-foreground">
        {!draftOnly && (
          <p id={privacyId} className="min-w-40 flex-1">
            Your question, follow-ups, and column names and types go to our AI.
            CSV rows stay in this browser.
          </p>
        )}
        <p id={limitId} className="shrink-0 tabular-nums">
          <span aria-hidden="true">
            {draft.length.toLocaleString()} / {characterLimit.toLocaleString()}
          </span>
          <span className="sr-only">
            Up to {characterLimit.toLocaleString()} characters.
          </span>
        </p>
      </div>
      {suggestions.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">Try a question</p>
          <div
            role="group"
            aria-label="Suggested questions"
            className={cn("grid min-w-0 gap-2", draftOnly && "sm:grid-cols-2")}
          >
            {suggestions.map((question) => (
              <Button
                key={question}
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setDraft(question);
                  input.current?.focus();
                }}
                className="h-auto min-h-10 min-w-0 justify-start border-panel-border px-3 py-2 text-left text-xs wrap-anywhere whitespace-normal max-sm:min-h-11"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}
      {(followUp || isPlanning) && (
        <div className="flex flex-wrap items-center gap-2">
          {followUp && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onStartOver}
            >
              New question
            </Button>
          )}
          {isPlanning && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      )}
      {status}
    </form>
  );
}
