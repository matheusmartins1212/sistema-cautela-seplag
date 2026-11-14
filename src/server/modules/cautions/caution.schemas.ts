import { z } from "zod";
import { CautionStatus } from "@prisma/client";

/**
 * Schemas Zod do módulo de cautelas. Cautelas são criadas automaticamente
 * pela aprovação de uma solicitação (módulo Requests). Aqui ficam apenas as
 * operações de listagem, leitura e cancelamento administrativo.
 */

const STATUS_LIST = z.union([
  z.nativeEnum(CautionStatus),
  z
    .string()
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.nativeEnum(CautionStatus))),
]);

export const listMyCautionsQuerySchema = z.object({
  status: STATUS_LIST.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const listAdminCautionsQuerySchema = z.object({
  status: STATUS_LIST.optional(),
  userId: z.string().trim().min(1).max(40).optional(),
  driverId: z.string().trim().min(1).max(40).optional(),
  vehicleId: z.string().trim().min(1).max(40).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const cancelCautionSchema = z.object({
  reason: z.string().trim().min(3, "Informe o motivo do cancelamento.").max(1000),
});

export type ListMyCautionsQuery = z.infer<typeof listMyCautionsQuerySchema>;
export type ListAdminCautionsQuery = z.infer<typeof listAdminCautionsQuerySchema>;
export type CancelCautionInput = z.infer<typeof cancelCautionSchema>;
