import { z } from "zod";
import { DamageSeverity, DamageStatus } from "@prisma/client";

export const createDamageSchema = z.object({
  vehicleId: z.string().trim().min(1).max(40),
  cautionId: z.string().trim().min(1).max(40).optional(),
  checklistId: z.string().trim().min(1).max(40).optional(),
  description: z.string().trim().min(5, "Descreva a avaria.").max(2000),
  severity: z.nativeEnum(DamageSeverity).default("LEVE"),
});

export const updateDamageSchema = z.object({
  description: z.string().trim().min(5).max(2000).optional(),
  severity: z.nativeEnum(DamageSeverity).optional(),
  status: z.nativeEnum(DamageStatus).optional(),
});

export const listDamagesQuerySchema = z.object({
  status: z.nativeEnum(DamageStatus).optional(),
  severity: z.nativeEnum(DamageSeverity).optional(),
  vehicleId: z.string().trim().min(1).max(40).optional(),
  cautionId: z.string().trim().min(1).max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateDamageInput = z.infer<typeof createDamageSchema>;
export type UpdateDamageInput = z.infer<typeof updateDamageSchema>;
export type ListDamagesQuery = z.infer<typeof listDamagesQuerySchema>;
