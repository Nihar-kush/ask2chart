import { z } from "zod";
import type { ExplanationRequest } from "@/types/analysis";
import { analysisErrorSchema } from "./analysisApiSchema";
import {
  explanationBudget,
  formatObservation,
  getExplanationFacts,
  type Observation,
} from "./getExplanationFacts";

const streamError = "The explanation was interrupted. Try again.";
const completionChunk = z.object({
  error: z.unknown().optional(),
  choices: z.array(
    z.object({
      delta: z.object({ content: z.string().nullish() }),
      finish_reason: z.string().nullish(),
    }),
  ),
});

async function* readEventData(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let skipLineFeed = false;
  let data: string[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      const decoded = decoder.decode(value, { stream: true });
      if (!decoded) continue;

      // A CR and its LF can arrive in separate chunks
      const chunk =
        skipLineFeed && decoded.startsWith("\n") ? decoded.slice(1) : decoded;
      skipLineFeed = decoded.endsWith("\r");
      const lines = (pending + chunk).split(/\r\n|\r|\n/);
      pending = lines.pop() ?? "";

      for (const line of lines) {
        if (!line && data.length > 0) {
          yield data.join("\n");
          data = [];
        } else if (line === "data" || line.startsWith("data:")) {
          data.push(line.slice(5).replace(/^ /, ""));
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function requestExplanation(
  payload: ExplanationRequest,
  signal: AbortSignal,
  onText: (text: string) => void,
) {
  let response: Response;
  try {
    response = await fetch("/api/explain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    throw new Error("Could not reach the assistant. Try again.");
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const error = analysisErrorSchema.safeParse(body);
    throw new Error(error.success ? error.data.error : streamError);
  }

  if (
    !response.body ||
    !response.headers.get("Content-Type")?.startsWith("text/event-stream")
  ) {
    throw new Error(streamError);
  }

  const observations = getExplanationFacts(payload);
  const facts = new Map(observations.map((fact) => [fact.id, fact]));
  const { maxFacts } = explanationBudget(observations, payload.rows.length);
  const presetPattern = payload.question?.trim()
    ? undefined
    : observations.find(({ id }) => id === "turning-point-1");
  const shownTopics = new Set<string>();
  let shownCount = 0;
  let showedInsight = false;
  const coverage =
    payload.rows.length < payload.resultGroupCount
      ? `This explanation covers ${payload.rows.length} of the ${payload.resultGroupCount} groups in this chart. `
      : payload.resultGroupCount === payload.chartLimit
        ? `This chart is limited to ${payload.chartLimit} groups. `
        : "";
  let pendingId = "";
  let previousFact: Observation | undefined;

  function overlaps(fact: Observation) {
    return (
      shownTopics.has(fact.topic) ||
      fact.covers?.some((topic) => shownTopics.has(topic))
    );
  }

  function showFact(line: string) {
    signal.throwIfAborted();
    const fact = facts.get(line.trim());
    if (!fact || overlaps(fact) || shownCount >= maxFacts) return;

    // Leave room for analytical context if the selected facts only report values
    if (
      !fact.insight &&
      !showedInsight &&
      shownCount === maxFacts - 1 &&
      observations.some(
        (candidate) => candidate.insight && !overlaps(candidate),
      )
    )
      return;

    const separator = previousFact ? " " : coverage;
    onText(separator + formatObservation(fact, previousFact));
    shownTopics.add(fact.topic);
    fact.covers?.forEach((topic) => shownTopics.add(topic));
    showedInsight ||= Boolean(fact.insight);
    shownCount++;
    previousFact = fact;
  }

  try {
    for await (const event of readEventData(response.body)) {
      signal.throwIfAborted();
      if (event.trim() === "[DONE]") {
        showFact(pendingId);
        if (shownCount > 0) {
          if (presetPattern && !overlaps(presetPattern))
            showFact(presetPattern.id);
          if (
            !showedInsight ||
            (!payload.question?.trim() && shownCount === 1)
          ) {
            const context = observations.find(
              (fact) => fact.insight && !overlaps(fact),
            );
            if (context) showFact(context.id);
          }
          return;
        }
        break;
      }

      const { choices, error } = completionChunk.parse(JSON.parse(event));
      if (error) break;

      const choice = choices[0];
      if (choice?.delta.content) {
        const lines = (pendingId + choice.delta.content).split("\n");
        pendingId = lines.pop() ?? "";
        lines.forEach(showFact);
      }
      if (choice?.finish_reason === "stop") {
        showFact(pendingId);
        pendingId = "";
      } else if (choice?.finish_reason) {
        break;
      }
    }
  } catch {
    signal.throwIfAborted();
  }
  throw new Error(streamError);
}
