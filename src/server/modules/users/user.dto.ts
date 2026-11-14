import type { User, UserRole, UserStatus } from "@prisma/client";
import { maskCpf } from "@/shared/validation/cpf";

/**
 * Representação segura do usuário para o cliente. NUNCA inclui `passwordHash`.
 * O CPF é mascarado (uso comum); telas administrativas específicas decidem se
 * exibem o CPF completo conforme permissão.
 */
export interface PublicUser {
  id: string;
  fullName: string;
  cpfMasked: string;
  registrationNumber: string;
  email: string;
  phone: string;
  sector: string;
  department: string;
  agency: string | null;
  isDriver: boolean;
  driverLicenseCategory: string | null;
  driverLicenseExpiresAt: string | null; // yyyy-mm-dd
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export function toPublicUser(user: Omit<User, "passwordHash">): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    cpfMasked: maskCpf(user.cpf),
    registrationNumber: user.registrationNumber,
    email: user.email,
    phone: user.phone,
    sector: user.sector,
    department: user.department,
    agency: user.agency,
    isDriver: user.isDriver,
    driverLicenseCategory: user.driverLicenseCategory,
    driverLicenseExpiresAt: user.driverLicenseExpiresAt?.toISOString().slice(0, 10) ?? null,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
