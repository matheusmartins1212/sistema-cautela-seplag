import { Prisma, UserStatus, type User } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import { isSuperAdmin } from "@/server/modules/auth/rbac";
import { revokeAllSessions, type SessionUser } from "@/server/modules/auth/session";
import { CANCELLABLE_CAUTION_STATUSES } from "@/server/modules/cautions/caution.service";
import type {
  ChangeUserRoleInput,
  ListUsersQuery,
  SetUserStatusInput,
  UpdateDriverProfileInput,
} from "./user.schemas";

export interface ListUsersResult {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listUsers(query: ListUsersQuery): Promise<ListUsersResult> {
  const where: Prisma.UserWhereInput = { deletedAt: null };
  if (query.status) where.status = query.status;
  if (query.role) where.role = query.role;
  if (query.driver) where.isDriver = true;
  if (query.search) {
    const term = query.search.trim();
    // CPF é armazenado só com dígitos; só entra na busca se o termo tiver dígitos.
    // (Antes usava um caractere nulo como "nunca casa", que o Postgres rejeita
    // em texto e derrubava a busca por nome/e-mail com erro 500.)
    const cpfDigits = term.replace(/\D/g, "");
    where.OR = [
      { fullName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { registrationNumber: { contains: term } },
      ...(cpfDigits ? [{ cpf: { contains: cpfDigits } }] : []),
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getUserByIdAdmin(id: string): Promise<User> {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw Errors.notFound("Usuário não encontrado.");
  return user;
}

/** Garante que o ator pode administrar o usuário-alvo. */
function ensureCanManage(target: User, actor: SessionUser): void {
  if (target.id === actor.user.id) {
    throw Errors.forbidden("Você não pode alterar a própria conta por aqui.");
  }
  // Apenas SUPER_ADMIN pode agir sobre contas ADMIN ou SUPER_ADMIN.
  if (
    (target.role === "ADMIN" || target.role === "SUPER_ADMIN") &&
    !isSuperAdmin(actor.user.role)
  ) {
    throw Errors.forbidden("Apenas o super administrador pode gerenciar contas administrativas.");
  }
}

export async function setUserStatus(
  id: string,
  input: SetUserStatusInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<User> {
  const target = await getUserByIdAdmin(id);
  ensureCanManage(target, actor);

  // Conta pendente de confirmação: o admin pode apenas confirmar manualmente
  // (ex.: e-mail institucional não chegou). Bloquear não se aplica.
  const manualConfirmation = target.status === UserStatus.PENDING_EMAIL_VERIFICATION;
  if (manualConfirmation && input.status !== UserStatus.ACTIVE) {
    throw Errors.conflict("Usuário ainda não confirmou o e-mail; só é possível liberar o acesso.");
  }
  if (target.status === input.status) {
    throw Errors.conflict("O usuário já está nesse status.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: manualConfirmation
      ? { status: input.status, emailVerifiedAt: new Date() }
      : { status: input.status },
  });

  // Bloqueio encerra imediatamente todas as sessões ativas do usuário.
  if (input.status === UserStatus.BLOCKED) {
    await revokeAllSessions(id);
  }

  await recordAudit({
    action: input.status === UserStatus.ACTIVE ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "User",
    entityId: id,
    metadata: {
      from: target.status,
      to: input.status,
      reason: input.reason ?? null,
      manualEmailConfirmation: manualConfirmation,
    },
    context,
  });

  return updated;
}

export async function changeUserRole(
  id: string,
  input: ChangeUserRoleInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<User> {
  // Defesa em profundidade: a rota já exige SUPER_ADMIN.
  if (!isSuperAdmin(actor.user.role)) {
    throw Errors.forbidden("Apenas o super administrador pode alterar papéis.");
  }
  if (id === actor.user.id) {
    throw Errors.forbidden("Você não pode alterar o próprio papel.");
  }

  const target = await getUserByIdAdmin(id);
  if (target.role === input.role) {
    throw Errors.conflict("O usuário já possui esse papel.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: input.role },
  });

  await recordAudit({
    action: "USER_ROLE_CHANGED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "User",
    entityId: id,
    metadata: { from: target.role, to: input.role },
    context,
  });

  return updated;
}

/**
 * Habilita ou desabilita o usuário como condutor da central. Qualquer
 * administrador pode fazê-lo (inclusive na própria conta, já que um gestor da
 * central também pode dirigir). Desabilitar não mexe nas viagens já escaladas.
 */
export async function updateDriverProfile(
  id: string,
  input: UpdateDriverProfileInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<User> {
  const target = await getUserByIdAdmin(id);

  const updated = await prisma.user.update({
    where: { id },
    data: {
      isDriver: input.isDriver,
      driverLicenseCategory: input.driverLicenseCategory ?? null,
      driverLicenseExpiresAt: input.driverLicenseExpiresAt
        ? new Date(`${input.driverLicenseExpiresAt}T00:00:00.000Z`)
        : null,
    },
  });

  await recordAudit({
    action: "USER_DRIVER_UPDATED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "User",
    entityId: id,
    metadata: {
      from: target.isDriver,
      to: input.isDriver,
      licenseCategory: input.driverLicenseCategory ?? null,
    },
    context,
  });

  return updated;
}

export interface DriverOverview {
  user: User;
  /** Viagens ainda não encerradas (programadas, em andamento ou atrasadas). */
  activeTrips: number;
  nextTripAt: Date | null;
}

/** Condutores da central com a carga de viagens em aberto de cada um. */
export async function listDriversOverview(): Promise<DriverOverview[]> {
  const drivers = await prisma.user.findMany({
    where: { isDriver: true, deletedAt: null },
    orderBy: { fullName: "asc" },
    include: {
      drivenCautions: {
        where: { status: { in: [...CANCELLABLE_CAUTION_STATUSES] } },
        select: { plannedWithdrawalAt: true },
        orderBy: { plannedWithdrawalAt: "asc" },
      },
    },
  });
  return drivers.map(({ drivenCautions, ...user }) => ({
    user,
    activeTrips: drivenCautions.length,
    nextTripAt: drivenCautions[0]?.plannedWithdrawalAt ?? null,
  }));
}
