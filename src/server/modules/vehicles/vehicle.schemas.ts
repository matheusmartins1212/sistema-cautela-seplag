import { z } from "zod";
import { VehicleCategory, VehicleStatus, VehicleUsageType } from "@prisma/client";
import { isValidPlate, normalizePlate } from "@/shared/validation/plate";

/**
 * Schemas Zod do módulo de veículos. Toda regra crítica (formato de placa,
 * categoria, transição de status) é aplicada AQUI, no backend.
 */

const plateField = z
  .string()
  .trim()
  .min(1, "Informe a placa.")
  .transform((v) => normalizePlate(v))
  .refine((p) => isValidPlate(p), { message: "Placa inválida." });

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable();

export const createVehicleSchema = z.object({
  brand: z.string().trim().min(1, "Informe a marca.").max(40),
  model: z.string().trim().min(1, "Informe o modelo.").max(60),
  plate: plateField,
  internalCode: z
    .string()
    .trim()
    .max(30)
    .transform((v) => (v.length === 0 ? null : v.toUpperCase()))
    .nullable()
    .optional(),
  category: z.nativeEnum(VehicleCategory),
  usageType: z.nativeEnum(VehicleUsageType),
  linkedSector: optionalTrimmed(80).optional(),
  agency: optionalTrimmed(80).optional(),
  currentMileage: z
    .number()
    .int("Quilometragem deve ser inteira.")
    .min(0, "Quilometragem não pode ser negativa.")
    .default(0),
  notes: optionalTrimmed(2000).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  active: z.boolean().optional(),
});

export const listVehiclesQuerySchema = z.object({
  category: z.nativeEnum(VehicleCategory).optional(),
  usageType: z.nativeEnum(VehicleUsageType).optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
  active: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((v) => (typeof v === "boolean" ? v : v === "true"))
    .optional(),
  search: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Transições de status controladas pelo admin -----------------------------
//
// Estados administrativos (admin pode entrar/sair livremente):
//   DISPONIVEL, BLOQUEADO, EM_MANUTENCAO, INATIVO, BAIXADO
//
// Estados de fluxo (gerenciados automaticamente por solicitações/cautelas — o
// admin NÃO deve alterar manualmente para preservar a integridade do ciclo):
//   RESERVADO, AGUARDANDO_RETIRADA, EM_USO, AGUARDANDO_DEVOLUCAO,
//   DEVOLVIDO, EM_ANALISE
//
// BAIXADO é tratado como terminal: voltar dele exige super admin (validado na
// rota). A função abaixo apenas valida targets aceitáveis.

const ADMIN_CONTROLLED_TARGETS = [
  VehicleStatus.DISPONIVEL,
  VehicleStatus.BLOQUEADO,
  VehicleStatus.EM_MANUTENCAO,
  VehicleStatus.INATIVO,
  VehicleStatus.BAIXADO,
] as const satisfies readonly VehicleStatus[];

const WORKFLOW_STATUSES = new Set<VehicleStatus>([
  VehicleStatus.RESERVADO,
  VehicleStatus.AGUARDANDO_RETIRADA,
  VehicleStatus.EM_USO,
  VehicleStatus.AGUARDANDO_DEVOLUCAO,
  VehicleStatus.DEVOLVIDO,
  VehicleStatus.EM_ANALISE,
]);

export function isWorkflowStatus(status: VehicleStatus): boolean {
  return WORKFLOW_STATUSES.has(status);
}

export function isAdminControlledTarget(status: VehicleStatus): boolean {
  return (ADMIN_CONTROLLED_TARGETS as readonly VehicleStatus[]).includes(status);
}

export const changeStatusSchema = z.object({
  targetStatus: z.nativeEnum(VehicleStatus).refine((s) => isAdminControlledTarget(s), {
    message: "Status não pode ser definido manualmente — ele é controlado pelo fluxo de cautelas.",
  }),
  reason: z.string().trim().min(3, "Informe o motivo.").max(500),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
