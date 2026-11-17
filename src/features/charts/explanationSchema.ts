import { z } from "zod";

export const maxExplanationGroups = 20;
export const maxExplanationLabelLength = 240;

export const explanationRequestSchema = z
  .strictObject({
    title: z.string().min(1).max(100),
    question: z.string().max(1000).nullable(),
    groupLabel: z.string().min(1).max(maxExplanationLabelLength),
    metricLabel: z.string().min(1).max(maxExplanationLabelLength),
    chartType: z.enum(["bar", "line"]).optional(),
    aggregation: z.enum(["count", "sum", "avg"]).optional(),
    chartLimit: z.number().int().min(1).max(100).optional(),
    groupByMonth: z.boolean().optional(),
    resultGroupCount: z.number().int().min(1).max(100),
    rows: z
      .array(
        z.strictObject({
          group: z.string().max(maxExplanationLabelLength),
          value: z.string().max(128).nullable(),
        }),
      )
      .min(1)
      .max(maxExplanationGroups),
  })
  .refine(
    ({ rows, resultGroupCount, chartLimit }) =>
      rows.length === Math.min(resultGroupCount, maxExplanationGroups) &&
      (chartLimit === undefined || resultGroupCount <= chartLimit),
  );
