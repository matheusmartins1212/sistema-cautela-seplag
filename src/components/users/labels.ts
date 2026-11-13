import type { UserRole, UserStatus } from "@prisma/client";

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  USER: "Usuário",
  ADMIN: "Administrador",
  SUPER_ADMIN: "Super administrador",
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  PENDING_EMAIL_VERIFICATION: "Aguardando confirmação",
  ACTIVE: "Ativo",
  BLOCKED: "Bloqueado",
  INACTIVE: "Inativo",
};
