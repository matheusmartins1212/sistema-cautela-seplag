import type { UserRole } from "@prisma/client";
import { USER_ROLE_LABEL } from "@/components/users/labels";
import { isValidCpf, maskCpf } from "@/shared/validation/cpf";
import { formatPhoneBr } from "@/shared/phone";

/** Dados da conta exibidos no painel do perfil (barra lateral). */
export interface ShellUser {
  fullName: string;
  email: string;
  roleLabel: string;
  /** CPF já mascarado: o número completo não vai para o navegador. */
  cpfMasked: string;
  registrationNumber: string;
  phone: string;
  sector: string;
  department: string;
  memberSince: string;
}

/** Valores de preenchimento (ex.: "000000" da conta inicial) contam como não informados. */
function informed(value: string): string {
  const trimmed = value.trim();
  return /^0+$/.test(trimmed.replace(/\D/g, "")) && /^[\d.\-\s]*$/.test(trimmed) ? "" : trimmed;
}

export function toShellUser(user: {
  fullName: string;
  email: string;
  role: UserRole;
  cpf: string;
  registrationNumber: string;
  phone: string;
  sector: string;
  department: string;
  createdAt: Date;
}): ShellUser {
  return {
    fullName: user.fullName,
    email: user.email,
    roleLabel: USER_ROLE_LABEL[user.role],
    cpfMasked: isValidCpf(user.cpf) ? maskCpf(user.cpf) : "",
    registrationNumber: informed(user.registrationNumber),
    phone: formatPhoneBr(informed(user.phone)),
    sector: informed(user.sector),
    department: informed(user.department),
    memberSince: user.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Cuiaba" }),
  };
}
