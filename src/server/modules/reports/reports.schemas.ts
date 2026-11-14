import { z } from "zod";
import type { DateRange } from "./reports.service";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const reportRangeSchema = z.object({
  from: z.string().regex(ISO_DATE).optional(),
  to: z.string().regex(ISO_DATE).optional(),
});

export const reportExportSchema = reportRangeSchema.extend({
  type: z.enum(["vehicle-usage", "by-sector", "by-agency", "by-driver", "damages"]),
});

export type ReportExportQuery = z.infer<typeof reportExportSchema>;

/** Converte as datas (YYYY-MM-DD) num intervalo UTC inclusivo. */
export function toDateRange(input: { from?: string; to?: string }): DateRange {
  const range: DateRange = {};
  if (input.from) range.from = new Date(`${input.from}T00:00:00.000Z`);
  if (input.to) range.to = new Date(`${input.to}T23:59:59.999Z`);
  return range;
}
