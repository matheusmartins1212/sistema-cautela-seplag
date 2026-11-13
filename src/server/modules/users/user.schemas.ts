import { z } from "zod";
import { UserRole, UserStatus } from "@prisma/client";

/** Schemas das operações administrativas sobre usuários. */

export const listUsersQuerySchema = z.object({
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(UserRole).optional(),
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

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;
export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;
