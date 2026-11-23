import { z } from "zod";
import { RequestStatus, Shift } from "@prisma/client";

/**
 * Schemas Zod do módulo de solicitações. Toda regra crítica (datas/horários
 * coerentes, campos obrigatórios) é aplicada AQUI, no backend.
 *
 * Na central de veículos compartilhados a solicitação é um pedido de
 * transporte: o órgão informa saída, destino, passageiros e finalidade; a
 * central decide veículo e condutor.
 *
 * Nome, CPF, matrícula, telefone, setor e lotação NÃO são aceitos do cliente —
 * o backend sempre puxa do usuário autenticado (seção 11 da especificação).
 * O órgão também vem do cadastro; `agency` só é aceito para contas antigas que
 * ainda não têm órgão (o valor passa a valer para a conta).
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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional();

/**
 * Turno deduzido do período, para manter relatórios e calendário que já usam
 * o campo: vários dias ou manhã + tarde = integral.
 */
export function deriveShift(input: {
  withdrawalDate: string;
  returnDate: string;
  withdrawalTime: string;
  returnTime: string;
}): Shift {
  if (input.returnDate !== input.withdrawalDate) return Shift.INTEGRAL;
  if (input.returnTime <= "12:00") return Shift.MATUTINO;
  if (input.withdrawalTime >= "12:00") return Shift.VESPERTINO;
  return Shift.INTEGRAL;
}

export const createRequestSchema = z
  .object({
    withdrawalDate: isoDate,
    returnDate: isoDate,
    // Opcional: quando ausente, o backend deduz pelo período (deriveShift).
    shift: z.nativeEnum(Shift).optional(),
    withdrawalTime: time,
    returnTime: time,
    origin: z.string().trim().min(2, "Informe o local de saída.").max(200),
    destination: z.string().trim().min(2, "Informe o destino.").max(200),
    reason: z.string().trim().min(2, "Informe a finalidade da viagem.").max(200),
    passengerCount: z.coerce
      .number({ invalid_type_error: "Informe o número de passageiros." })
      .int("Use um número inteiro.")
      .min(1, "Informe ao menos 1 passageiro.")
      .max(60, "Número de passageiros acima do permitido."),
    passengerNames: optionalText(1000),
    contactPhone: optionalText(20),
    agency: optionalText(150),
    termNumber: optionalText(60),
  })
  .superRefine((data, ctx) => {
    if (data.returnDate < data.withdrawalDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["returnDate"],
        message: "O retorno deve ser no mesmo dia ou depois da saída.",
      });
      return;
    }
    if (data.returnDate === data.withdrawalDate) {
      if (data.returnTime <= data.withdrawalTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnTime"],
          message: "O horário de retorno deve ser depois do horário de saída.",
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
  agency: z.string().trim().min(1).max(150).optional(),
  withdrawalDateFrom: isoDate.optional(),
  withdrawalDateTo: isoDate.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const approveRequestSchema = z.object({
  vehicleId: z.string().trim().min(1, "Selecione o veículo.").max(40),
  driverId: z.string().trim().min(1, "Selecione o condutor.").max(40),
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
