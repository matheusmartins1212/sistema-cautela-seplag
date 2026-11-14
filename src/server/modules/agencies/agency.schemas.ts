import { z } from "zod";

/** Schemas do catálogo de órgãos atendidos pela central. */

export const createAgencySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do órgão.").max(150),
});

export const updateAgencySchema = z.object({
  active: z.boolean(),
});

export type CreateAgencyInput = z.infer<typeof createAgencySchema>;
export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>;
