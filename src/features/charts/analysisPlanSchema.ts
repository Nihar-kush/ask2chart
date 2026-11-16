import { z } from "zod";

export const analysisPlanSchema = z.strictObject({
  groupBy: z.strictObject({
    column: z.string().min(1),
    bucket: z.enum(["value", "month"]),
  }),
  metric: z.discriminatedUnion("aggregation", [
    z.strictObject({ aggregation: z.literal("count") }),
    z.strictObject({
      aggregation: z.enum(["sum", "avg"]),
      column: z.string().min(1),
    }),
  ]),
  filters: z
    .array(
      z.strictObject({
        column: z.string().min(1),
        equals: z.union([z.string(), z.number(), z.boolean()]),
      }),
    )
    .max(3),
  sort: z.strictObject({
    by: z.enum(["group", "metric"]),
    direction: z.enum(["asc", "desc"]),
  }),
  limit: z.number().int().min(1).max(100),
  chart: z.enum(["bar", "line"]),
});
