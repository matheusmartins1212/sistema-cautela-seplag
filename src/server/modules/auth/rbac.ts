import type { UserRole } from "@prisma/client";

/**
 * Controle de acesso por papéis (RBAC). Hierarquia:
 *   USER < ADMIN < SUPER_ADMIN
 *
 * Estas funções são puras; a aplicação efetiva ocorre nos guards do backend.
 */
const ROLE_RANK: Record<UserRole, number> = {
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/** Verdadeiro se `role` tem privilégio igual ou superior a `required`. */
export function hasAtLeastRole(role: UserRole, required: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export function isAdmin(role: UserRole): boolean {
  return hasAtLeastRole(role, "ADMIN");
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}
