import type { AnalysisConversation } from "@/types/analysis";
import type { DatasetColumn } from "@/types/dataset";
import {
  analysisErrorSchema,
  analysisReplySchema,
  analysisRequestSchema,
  maxAnalysisColumns,
} from "./analysisApiSchema";

export async function requestAnalysis(
  conversation: AnalysisConversation,
  columns: DatasetColumn[],
  signal: AbortSignal,
) {
  if (columns.length > maxAnalysisColumns) {
    throw new Error(
      `The assistant supports datasets with up to ${maxAnalysisColumns} columns.`,
    );
  }
  const input = analysisRequestSchema.safeParse({
    ...conversation,
    columns: columns.map(({ name, type }) => ({ name, type })),
  });
  if (!input.success) {
    throw new Error(
      "This dataset schema or question is too large for the assistant.",
    );
  }

  let response: Response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
      signal,
    });
  } catch {
    throw new Error(
      "Could not reach the assistant. Check your connection and try again.",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = analysisErrorSchema.safeParse(body);
    throw new Error(
      error.success
        ? error.data.error
        : "The assistant is unavailable. Try again.",
    );
  }

  const reply = analysisReplySchema.safeParse(body);
  if (!reply.success)
    throw new Error(
      "The assistant returned an invalid plan. Try asking again.",
    );

  return reply.data.result;
}
