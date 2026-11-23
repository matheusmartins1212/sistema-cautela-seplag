import type { UserRole } from "@prisma/client";
import { USER_ROLE_LABEL } from "@/components/users/labels";

/** O mínimo que a barra lateral precisa saber de quem está logado. */
export interface ShellUser {
  fullName: string;
  roleLabel: string;
}

export function toShellUser(user: { fullName: string; role: UserRole }): ShellUser {
  return { fullName: user.fullName, roleLabel: USER_ROLE_LABEL[user.role] };
}
