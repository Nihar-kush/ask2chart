import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { PendingClarification } from "@/types/analysis";
import { maxQuestionLength, maxReplyLength } from "./analysisApiSchema";

type AskAnalysisFormProps = {
  followUp: PendingClarification | null;
  status: ReactNode;
  busy: boolean;
  isPlanning: boolean;
  isVisible: boolean;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onStartOver: () => void;
};

export function AskAnalysisForm({
  followUp,
  status,
  busy,
  isPlanning,
  isVisible,
  onSubmit,
  onCancel,
  onStartOver,
}: AskAnalysisFormProps) {
  const inputId = useId();
  const privacyId = `${inputId}-privacy`;
  const promptId = `${inputId}-follow-up`;
  const input = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (followUp && isVisible) input.current?.focus();
  }, [followUp, isVisible]);

  function send(value: string) {
    const answer = value.trim();
    if (answer && !busy) onSubmit(answer);
  }

  return (
    <form
      className="grid min-w-0 gap-3 rounded-xl border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        send(draft);
      }}
    >
      <h2 className="text-sm font-semibold">Ask2Chart Assistant</h2>

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

      <div className="grid min-w-0 gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          {followUp ? "Your reply" : "Your question"}
        </label>
        <textarea
          id={inputId}
          ref={input}
          aria-describedby={followUp ? `${promptId} ${privacyId}` : privacyId}
          rows={followUp ? 2 : 3}
          maxLength={followUp ? maxReplyLength : maxQuestionLength}
          value={draft}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            followUp ? "Type your answer" : "Show total revenue by category"
          }
          className="min-w-0 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2"
        />
      </div>
      <p id={privacyId} className="text-xs text-muted-foreground">
        Your question, follow-ups, and column names and types go to our AI. CSV
        rows stay in this browser.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy || !draft.trim()}>
          {followUp ? "Send reply" : "Ask assistant"}
        </Button>
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
      {status}
    </form>
  );
}
