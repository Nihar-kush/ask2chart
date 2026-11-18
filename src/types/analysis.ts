import type { z } from "zod";
import type {
  analysisConversationSchema,
  analysisReplySchema,
} from "@/features/charts/analysisApiSchema";
import type { analysisPlanSchema } from "@/features/charts/analysisPlanSchema";
import type { explanationRequestSchema } from "@/features/charts/explanationSchema";
import type { SqlParameter } from "@/lib/duckdb/query";

export type AnalysisPlan = z.infer<typeof analysisPlanSchema>;

export type CompiledAnalysis = {
  plan: AnalysisPlan;
  sql: string;
  parameters: SqlParameter[];
};

export type SavedAnalysis = {
  id: number;
  datasetId: string;
  title: string;
  question: string | null;
  plan: AnalysisPlan;
  createdAt: number;
};

export type AnalysisRow = {
  group: string;
  value: string | null;
};

export type AnalysisResult = CompiledAnalysis & {
  rows: AnalysisRow[];
  queryDurationMs: number;
};

export type AnalysisConversation = z.infer<typeof analysisConversationSchema>;

export type PendingClarification = {
  conversation: AnalysisConversation;
  reply: Extract<
    z.infer<typeof analysisReplySchema>["result"],
    { kind: "clarification" }
  >;
};

export type ExplanationRequest = z.infer<typeof explanationRequestSchema>;
