import { z } from "zod";
import { UserRole, UserStatus } from "@prisma/client";

/** Schemas das operações administrativas sobre usuários. */

export const listUsersQuerySchema = z.object({
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(UserRole).optional(),
  // "1" lista só condutores (filtro da tela de usuários).
  driver: z
    .enum(["1"])
    .transform(() => true)
    .optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// O admin só alterna entre ATIVO e BLOQUEADO (controle de acesso). Reativar uma
// conta PENDENTE não é permitido por aqui — depende da confirmação de e-mail.
export const setUserStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED]),
  reason: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
});

export const changeUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

// Categorias de CNH aceitas (Res. Contran): simples e combinadas com A.
const LICENSE_CATEGORIES = ["B", "C", "D", "E", "AB", "AC", "AD", "AE"] as const;

/** Habilita/desabilita o usuário como condutor da central, com dados da CNH. */
export const updateDriverProfileSchema = z
  .object({
    isDriver: z.boolean(),
    driverLicenseCategory: z
      .string()
      .trim()
      .toUpperCase()
      .transform((v) => (v.length === 0 ? null : v))
      .nullable()
      .optional()
      .refine((v) => v == null || (LICENSE_CATEGORIES as readonly string[]).includes(v), {
        message: "Categoria de CNH inválida.",
      }),
    driverLicenseExpiresAt: z
      .string()
      .trim()
      .transform((v) => (v.length === 0 ? null : v))
      .nullable()
      .optional()
      .refine((v) => v == null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
        message: "Use o formato AAAA-MM-DD.",
      }),
  })
  .superRefine((data, ctx) => {
    if (data.isDriver && !data.driverLicenseCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["driverLicenseCategory"],
        message: "Informe a categoria da CNH do condutor.",
      });
    }
  });

export const DRIVER_LICENSE_CATEGORIES = LICENSE_CATEGORIES;

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateDriverProfileInput = z.infer<typeof updateDriverProfileSchema>;
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;
export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;
