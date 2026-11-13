import { z } from "zod";
import { RequestStatus, Shift } from "@prisma/client";

/**
 * Schemas Zod do módulo de solicitações. Toda regra crítica (datas/horários
 * coerentes, campos obrigatórios) é aplicada AQUI, no backend.
 *
 * Nome, CPF, matrícula, telefone, setor e lotação NÃO são aceitos do cliente —
 * o backend sempre puxa do usuário autenticado (seção 11 da especificação).
 */

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isoDate = z
  .string()
  .trim()
  .regex(ISO_DATE_REGEX, "Use o formato AAAA-MM-DD.")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00.000Z`)), {
    message: "Data inválida.",
  });

const time = z.string().trim().regex(HHMM_REGEX, "Use o formato HH:mm.");

export const createRequestSchema = z
  .object({
    withdrawalDate: isoDate,
    returnDate: isoDate,
    shift: z.nativeEnum(Shift),
    withdrawalTime: time,
    returnTime: time,
    destination: z.string().trim().min(2, "Informe o destino.").max(200),
    reason: z.string().trim().min(2, "Informe o motivo da cautela.").max(200),
    termNumber: z
      .string()
      .trim()
      .max(60)
      .transform((v) => (v.length === 0 ? null : v))
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.returnDate < data.withdrawalDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["returnDate"],
        message: "A devolução deve ser igual ou posterior à retirada.",
      });
      return;
    }
    if (data.returnDate === data.withdrawalDate) {
      if (data.returnTime <= data.withdrawalTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnTime"],
          message: "Horário de devolução deve ser posterior ao de retirada.",
        });
      }
    }
  });

const STATUS_LIST = z.union([
  z.nativeEnum(RequestStatus),
  z
    .string()
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.nativeEnum(RequestStatus))),
]);

export const listMyRequestsQuerySchema = z.object({
  status: STATUS_LIST.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const listAdminRequestsQuerySchema = z.object({
  status: STATUS_LIST.optional(),
  userId: z.string().trim().min(1).max(40).optional(),
  withdrawalDateFrom: isoDate.optional(),
  withdrawalDateTo: isoDate.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const approveRequestSchema = z.object({
  vehicleId: z.string().trim().min(1, "Selecione o veículo a liberar.").max(40),
  adminNotes: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
});

export const rejectRequestSchema = z.object({
  rejectionReason: z.string().trim().min(3, "Informe o motivo da recusa.").max(1000),
  adminNotes: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
});

export const cancelRequestSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type ListMyRequestsQuery = z.infer<typeof listMyRequestsQuerySchema>;
export type ListAdminRequestsQuery = z.infer<typeof listAdminRequestsQuerySchema>;
export type ApproveRequestInput = z.infer<typeof approveRequestSchema>;
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;
