import { z } from "zod";
import { analysisPlanSchema } from "./analysisPlanSchema";

export const maxQuestionLength = 1000;
export const maxAnalysisColumns = 100;
export const maxClarificationTurns = 3;
export const maxReplyLength = 500;

const clarificationMessage = z.string().trim().min(1).max(350);

export const analysisConversationSchema = z.strictObject({
  question: z.string().trim().min(1).max(maxQuestionLength),
  clarifications: z
    .array(
      z.strictObject({
        question: clarificationMessage,
        answer: z.string().trim().min(1).max(maxReplyLength),
      }),
    )
    .max(maxClarificationTurns)
    .default([]),
});

export const analysisRequestSchema = analysisConversationSchema.extend({
  columns: z
    .array(
      z.strictObject({
        name: z.string().min(1).max(256),
        type: z.string().min(1).max(128),
      }),
    )
    .min(1)
    .max(maxAnalysisColumns),
});

export const analysisReplySchema = z.strictObject({
  result: z.union([
    z.strictObject({
      kind: z.literal("plan"),
      title: z.string().min(1).max(100),
      plan: analysisPlanSchema,
    }),
    z.strictObject({
      kind: z.literal("unsupported"),
      message: clarificationMessage,
    }),
    z.strictObject({
      kind: z.literal("clarification"),
      message: clarificationMessage,
      choices: z.array(z.string().trim().min(1).max(120)).max(3),
    }),
  ]),
});

export const analysisErrorSchema = z.strictObject({
  error: z.string().min(1),
});
