import {
  CautionStatus,
  ChecklistStatus,
  Prisma,
  VehicleStatus,
  type Caution,
  type User,
  type Vehicle,
  type VehicleRequest,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import { isAdmin } from "@/server/modules/auth/rbac";
import type { SessionUser } from "@/server/modules/auth/session";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import { isWorkflowStatus } from "@/server/modules/vehicles/vehicle.schemas";
import type {
  CancelCautionInput,
  ListAdminCautionsQuery,
  ListMyCautionsQuery,
} from "@/server/modules/cautions/caution.schemas";

type CautionWithRelations = Caution & {
  request?: VehicleRequest;
  user?: User;
  vehicle?: Vehicle;
};

// O admin pode cancelar em qualquer fase enquanto a cautela não estiver encerrada.
// Também define quais cautelas "seguram" um veículo (ver liberação no cancelamento).
export const CANCELLABLE_CAUTION_STATUSES: readonly CautionStatus[] = [
  CautionStatus.AGUARDANDO_RETIRADA,
  CautionStatus.RETIRADA_EM_ANDAMENTO,
  CautionStatus.EM_USO,
  CautionStatus.AGUARDANDO_DEVOLUCAO,
  CautionStatus.DEVOLUCAO_EM_ANALISE,
  CautionStatus.ATRASADA,
];

export function isCautionCancellable(status: CautionStatus): boolean {
  return CANCELLABLE_CAUTION_STATUSES.includes(status);
}

// Cautela ativa cujo veículo já saiu do pátio.
export function isVehicleOut(status: CautionStatus): boolean {
  return (
    isCautionCancellable(status) &&
    status !== CautionStatus.AGUARDANDO_RETIRADA &&
    status !== CautionStatus.RETIRADA_EM_ANDAMENTO
  );
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function ensureFound<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw Errors.notFound("Cautela não encontrada.");
  }
  return value;
}

function ensureCanRead(c: Caution, actor: SessionUser): void {
  if (c.userId !== actor.user.id && !isAdmin(actor.user.role)) {
    // Anti-IDOR: mesma mensagem que "não existe".
    throw Errors.notFound("Cautela não encontrada.");
  }
}

function statusFilter(status: ListMyCautionsQuery["status"]): Prisma.CautionWhereInput | undefined {
  if (!status) return undefined;
  if (Array.isArray(status)) {
    if (status.length === 0) return undefined;
    return { status: { in: status } };
  }
  return { status };
}

// ----------------------------------------------------------------------------
// Listagens
// ----------------------------------------------------------------------------

export interface ListCautionsResult {
  items: CautionWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listMyCautions(
  query: ListMyCautionsQuery,
  actor: SessionUser,
): Promise<ListCautionsResult> {
  const where: Prisma.CautionWhereInput = {
    userId: actor.user.id,
    ...statusFilter(query.status),
  };

  const [total, items] = await prisma.$transaction([
    prisma.caution.count({ where }),
    prisma.caution.findMany({
      where,
      orderBy: [{ plannedWithdrawalAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { request: true, vehicle: true },
    }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function listAllCautions(query: ListAdminCautionsQuery): Promise<ListCautionsResult> {
  const where: Prisma.CautionWhereInput = { ...statusFilter(query.status) };
  if (query.userId) where.userId = query.userId;
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.search) {
    const term = query.search.trim();
    where.OR = [
      { publicCode: { contains: term.toUpperCase() } },
      { user: { fullName: { contains: term, mode: "insensitive" } } },
      { user: { registrationNumber: { contains: term } } },
      { vehicle: { plate: { contains: term.toUpperCase() } } },
      { vehicle: { model: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.caution.count({ where }),
    prisma.caution.findMany({
      where,
      orderBy: [{ status: "asc" }, { plannedWithdrawalAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { request: true, user: true, vehicle: true },
    }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getCautionById(
  id: string,
  actor: SessionUser,
): Promise<CautionWithRelations> {
  const caution = await prisma.caution.findUnique({
    where: { id },
    include: { request: true, user: true, vehicle: true },
  });
  ensureFound(caution);
  ensureCanRead(caution as Caution, actor);
  return caution as CautionWithRelations;
}

// ----------------------------------------------------------------------------
// Cancelamento (admin)
// ----------------------------------------------------------------------------

export async function cancelCautionByAdmin(
  id: string,
  input: CancelCautionInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<Caution> {
  const caution = await prisma.caution.findUnique({
    where: { id },
    include: { vehicle: true },
  });
  ensureFound(caution);

  if (!isCautionCancellable(caution!.status)) {
    throw Errors.conflict("Esta cautela já está encerrada e não pode ser cancelada.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Guarda atômica: só cancela se ainda estiver em fase cancelável (evita corrida
    // com a finalização da devolução ou outro cancelamento simultâneo).
    const { count } = await tx.caution.updateMany({
      where: { id, status: { in: [...CANCELLABLE_CAUTION_STATUSES] } },
      data: {
        status: CautionStatus.CANCELADA,
        finalNotes: input.reason,
      },
    });
    if (count === 0) {
      throw Errors.conflict("Esta cautela já está encerrada e não pode ser cancelada.");
    }

    // Checklists ainda não enviados perdem o sentido; os enviados ficam como registro.
    await tx.checklist.updateMany({
      where: {
        cautionId: id,
        status: { in: [ChecklistStatus.PENDENTE, ChecklistStatus.EM_PREENCHIMENTO] },
      },
      data: { status: ChecklistStatus.CANCELADO },
    });

    // Libera o veículo se ele está num estado de fluxo (reservado, em uso, aguardando
    // devolução...). O admin não consegue mudar esses estados à mão, então sem isso o
    // carro ficaria preso. Se outra cautela ativa usa o mesmo veículo, quem manda no
    // status é ela; não mexe.
    if (caution!.vehicle && isWorkflowStatus(caution!.vehicle.currentStatus)) {
      const otherActive = await tx.caution.count({
        where: {
          vehicleId: caution!.vehicleId,
          id: { not: id },
          status: { in: [...CANCELLABLE_CAUTION_STATUSES] },
        },
      });
      if (otherActive === 0) {
        await tx.vehicle.update({
          where: { id: caution!.vehicleId },
          data: { currentStatus: VehicleStatus.DISPONIVEL },
        });
      }
    }

    return tx.caution.findUniqueOrThrow({ where: { id } });
  });

  await recordAudit({
    action: "CAUTION_CANCELLED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "Caution",
    entityId: id,
    metadata: {
      publicCode: result.publicCode,
      reason: input.reason,
      previousStatus: caution!.status,
      vehicleId: caution!.vehicleId,
    },
    context,
  });

  // Notifica o dono da cautela sobre o cancelamento (best effort).
  await createNotification({
    userId: caution!.userId,
    type: "GENERAL",
    title: "Cautela cancelada",
    message: `Sua cautela ${result.publicCode} foi cancelada pela administração. Motivo: ${input.reason}`,
    relatedEntityType: "Caution",
    relatedEntityId: id,
  });

  return result;
}
