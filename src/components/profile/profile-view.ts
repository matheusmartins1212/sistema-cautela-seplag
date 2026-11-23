import type { UserRole, UserStatus } from "@prisma/client";
import { USER_ROLE_LABEL } from "@/components/users/labels";
import { isValidCpf, maskCpf } from "@/shared/validation/cpf";
import { formatPhoneBr } from "@/shared/phone";

/** Dados da conta exibidos na página "Meu perfil". */
export interface ProfileView {
  fullName: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  status: UserStatus;
  /** CPF mascarado: o número completo não aparece na tela. */
  cpfMasked: string;
  registrationNumber: string;
  phone: string;
  sector: string;
  department: string;
  memberSince: string;
  emailVerifiedOn: string;
}

/** Valores de preenchimento (ex.: "000000" da conta inicial) contam como não informados. */
function informed(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return /^[\d.\-\s]*$/.test(trimmed) && /^0*$/.test(trimmed.replace(/\D/g, "")) ? "" : trimmed;
}

function dateBr(value: Date | null | undefined): string {
  return value ? value.toLocaleDateString("pt-BR", { timeZone: "America/Cuiaba" }) : "";
}

export function toProfileView(user: {
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  cpf: string;
  registrationNumber: string;
  phone: string | null;
  sector: string;
  department: string;
  createdAt: Date;
  emailVerifiedAt: Date | null;
}): ProfileView {
  return {
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    roleLabel: USER_ROLE_LABEL[user.role],
    status: user.status,
    cpfMasked: isValidCpf(user.cpf) ? maskCpf(user.cpf) : "",
    registrationNumber: informed(user.registrationNumber),
    phone: formatPhoneBr(informed(user.phone)),
    sector: informed(user.sector),
    department: informed(user.department),
    memberSince: dateBr(user.createdAt),
    emailVerifiedOn: dateBr(user.emailVerifiedAt),
  };
}
