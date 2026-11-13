import {
  CautionStatus,
  Prisma,
  RequestStatus,
  VehicleStatus,
  type Caution,
  type User,
  type Vehicle,
  type VehicleRequest,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { env } from "@/server/config/env";
import { Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import { generateCautionCode, generateRequestCode } from "@/server/lib/public-code";
import { isAdmin } from "@/server/modules/auth/rbac";
import type { SessionUser } from "@/server/modules/auth/session";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import { sendTransactionalEmail } from "@/server/modules/email/email.service";
import {
  buildRequestApproved,
  buildRequestReceived,
  buildRequestRejected,
} from "@/server/modules/email/templates/request-templates";
import {
  type ApproveRequestInput,
  type CancelRequestInput,
  type CreateRequestInput,
  type ListAdminRequestsQuery,
  type ListMyRequestsQuery,
  type RejectRequestInput,
} from "@/server/modules/requests/request.schemas";

const MAX_PUBLIC_CODE_RETRIES = 5;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function parseIsoDate(value: string): Date {
  // Tratamos a data como UTC à meia-noite — coerente com `@db.Date` do Prisma.
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateBr(date: Date): string {
  // Em UTC para casar com a parte de data armazenada.
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

function ensureRequestFound<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw Errors.notFound("Solicitação não encontrada.");
  }
  return value;
}

function ensureCanRead(req: VehicleRequest, actor: SessionUser): void {
  if (req.userId !== actor.user.id && !isAdmin(actor.user.role)) {
    // Anti-IDOR: mesma mensagem que "não existe".
    throw Errors.notFound("Solicitação não encontrada.");
  }
}

// ----------------------------------------------------------------------------
// Criação (usuário comum)
// ----------------------------------------------------------------------------

export async function createRequest(
  input: CreateRequestInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<VehicleRequest> {
  const withdrawalDate = parseIsoDate(input.withdrawalDate);
  const returnDate = parseIsoDate(input.returnDate);

  let created: VehicleRequest | null = null;
  let attempts = 0;
  // Retry curto contra colisão de publicCode (P2002 no índice único).
  while (attempts < MAX_PUBLIC_CODE_RETRIES) {
    attempts++;
    try {
      created = await prisma.vehicleRequest.create({
        data: {
          publicCode: generateRequestCode(new Date()),
          userId: actor.user.id,
          withdrawalDate,
          returnDate,
          shift: input.shift,
          withdrawalTime: input.withdrawalTime,
          returnTime: input.returnTime,
          destination: input.destination,
          reason: input.reason,
          termNumber: input.termNumber ?? null,
          status: RequestStatus.PENDENTE_ANALISE,
        },
      });
      break;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempts < MAX_PUBLIC_CODE_RETRIES
      ) {
        continue; // tenta outro código
      }
      throw error;
    }
  }
  if (!created) {
    throw Errors.internal("Não foi possível gerar um código único.");
  }

  await recordAudit({
    action: "REQUEST_CREATED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "VehicleRequest",
    entityId: created.id,
    metadata: {
      publicCode: created.publicCode,
      withdrawalDate: input.withdrawalDate,
      returnDate: input.returnDate,
    },
    context,
  });

  // E-mail de confirmação (best effort — não derruba a criação)
  void sendTransactionalEmail(
    buildRequestReceived({
      to: actor.user.email,
      fullName: actor.user.fullName,
      publicCode: created.publicCode,
      destination: created.destination,
      withdrawalDate: formatDateBr(created.withdrawalDate),
      returnDate: formatDateBr(created.returnDate),
      detailsUrl: `${env.APP_BASE_URL}/solicitacoes/${created.id}`,
      requestId: created.id,
    }),
  ).catch(() => undefined);

  return created;
}

// ----------------------------------------------------------------------------
// Listagens
// ----------------------------------------------------------------------------

type RequestWithRelations = VehicleRequest & {
  user?: User;
  caution?: (Caution & { vehicle?: Vehicle }) | null;
};

export interface ListRequestsResult {
  items: RequestWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

function statusFilter(
  status: ListMyRequestsQuery["status"],
): Prisma.VehicleRequestWhereInput | undefined {
  if (!status) return undefined;
  if (Array.isArray(status)) {
    if (status.length === 0) return undefined;
    return { status: { in: status } };
  }
  return { status };
}

export async function listMyRequests(
  query: ListMyRequestsQuery,
  actor: SessionUser,
): Promise<ListRequestsResult> {
  const where: Prisma.VehicleRequestWhereInput = {
    userId: actor.user.id,
    ...statusFilter(query.status),
  };

  const [total, items] = await prisma.$transaction([
    prisma.vehicleRequest.count({ where }),
    prisma.vehicleRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { caution: { include: { vehicle: true } } },
    }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function listAllRequests(query: ListAdminRequestsQuery): Promise<ListRequestsResult> {
  const where: Prisma.VehicleRequestWhereInput = { ...statusFilter(query.status) };
  if (query.userId) where.userId = query.userId;
  if (query.withdrawalDateFrom || query.withdrawalDateTo) {
    where.withdrawalDate = {};
    if (query.withdrawalDateFrom) where.withdrawalDate.gte = parseIsoDate(query.withdrawalDateFrom);
    if (query.withdrawalDateTo) where.withdrawalDate.lte = parseIsoDate(query.withdrawalDateTo);
  }
  if (query.search) {
    const term = query.search.trim();
    where.OR = [
      { publicCode: { contains: term.toUpperCase() } },
      { destination: { contains: term, mode: "insensitive" } },
      { reason: { contains: term, mode: "insensitive" } },
      { user: { fullName: { contains: term, mode: "insensitive" } } },
      { user: { registrationNumber: { contains: term } } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.vehicleRequest.count({ where }),
    prisma.vehicleRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        user: true,
        caution: { include: { vehicle: true } },
      },
    }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getRequestById(
  id: string,
  actor: SessionUser,
): Promise<RequestWithRelations> {
  const req = await prisma.vehicleRequest.findUnique({
    where: { id },
    include: {
      user: true,
      caution: { include: { vehicle: true } },
    },
  });
  ensureRequestFound(req);
  ensureCanRead(req as VehicleRequest, actor);
  return req as RequestWithRelations;
}

// ----------------------------------------------------------------------------
// Cancelamento pelo usuário
// ----------------------------------------------------------------------------

export async function cancelMyRequest(
  id: string,
  input: CancelRequestInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<VehicleRequest> {
  const req = await prisma.vehicleRequest.findUnique({ where: { id } });
  ensureRequestFound(req);
  if (req!.userId !== actor.user.id) {
    throw Errors.notFound("Solicitação não encontrada."); // anti-IDOR
  }
  if (req!.status !== RequestStatus.PENDENTE_ANALISE) {
    throw Errors.conflict("Apenas solicitações ainda em análise podem ser canceladas.");
  }

  const updated = await prisma.vehicleRequest.update({
    where: { id },
    data: {
      status: RequestStatus.CANCELADA_PELO_USUARIO,
      adminNotes: input.cancellationReason ?? null,
      decidedAt: new Date(),
    },
  });

  await recordAudit({
    action: "REQUEST_CANCELLED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "VehicleRequest",
    entityId: id,
    metadata: { by: "user", publicCode: updated.publicCode },
    context,
  });

  return updated;
}

// ----------------------------------------------------------------------------
// Aprovação (admin) — transação atômica que cria a Caution e reserva o veículo
// ----------------------------------------------------------------------------

function hasDateRangeConflict(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  // Sobreposição se aStart < bEnd && bStart < aEnd.
  return aStart < bEnd && bStart < aEnd;
}

/** Combina data + HH:mm em UTC. */
function combineDateTime(date: Date, hhmm: string): Date {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const out = new Date(date);
  out.setUTCHours(h, m, 0, 0);
  return out;
}

export interface ApproveRequestResult {
  request: VehicleRequest;
  caution: Caution;
  vehicle: Vehicle;
}

export async function approveRequest(
  id: string,
  input: ApproveRequestInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<ApproveRequestResult> {
  // Validações pré-transação que não dependem de lock.
  const req = await prisma.vehicleRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  ensureRequestFound(req);
  if (req!.status !== RequestStatus.PENDENTE_ANALISE) {
    throw Errors.conflict("Esta solicitação não está mais em análise.");
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
  });
  if (!vehicle) throw Errors.notFound("Veículo não encontrado.");
  if (!vehicle.active) {
    throw Errors.conflict("Veículo está inativo e não pode ser liberado.");
  }
  if (
    vehicle.currentStatus !== VehicleStatus.DISPONIVEL &&
    vehicle.currentStatus !== VehicleStatus.RESERVADO
  ) {
    throw Errors.conflict(`Veículo não está disponível (status atual: ${vehicle.currentStatus}).`);
  }

  const newPeriodStart = combineDateTime(req!.withdrawalDate, req!.withdrawalTime);
  const newPeriodEnd = combineDateTime(req!.returnDate, req!.returnTime);

  // Conflito com outras cautelas ativas do mesmo veículo
  const overlapping = await prisma.caution.findMany({
    where: {
      vehicleId: vehicle.id,
      status: {
        in: [
          CautionStatus.AGUARDANDO_RETIRADA,
          CautionStatus.RETIRADA_EM_ANDAMENTO,
          CautionStatus.EM_USO,
          CautionStatus.AGUARDANDO_DEVOLUCAO,
          CautionStatus.DEVOLUCAO_EM_ANALISE,
          CautionStatus.ATRASADA,
        ],
      },
    },
    select: { plannedWithdrawalAt: true, plannedReturnAt: true, publicCode: true },
  });
  for (const c of overlapping) {
    if (
      hasDateRangeConflict(newPeriodStart, newPeriodEnd, c.plannedWithdrawalAt, c.plannedReturnAt)
    ) {
      throw Errors.conflict(`Veículo possui cautela conflitante no período (${c.publicCode}).`);
    }
  }

  // Transação: cria a cautela, atualiza a solicitação e o status do veículo.
  let attempts = 0;
  let result: ApproveRequestResult | null = null;
  while (attempts < MAX_PUBLIC_CODE_RETRIES) {
    attempts++;
    try {
      result = await prisma.$transaction(async (tx) => {
        const newCaution = await tx.caution.create({
          data: {
            publicCode: generateCautionCode(new Date()),
            requestId: id,
            userId: req!.userId,
            vehicleId: vehicle.id,
            status: CautionStatus.AGUARDANDO_RETIRADA,
            approvedByAdminId: actor.user.id,
            plannedWithdrawalAt: newPeriodStart,
            plannedReturnAt: newPeriodEnd,
          },
        });
        const updatedRequest = await tx.vehicleRequest.update({
          where: { id },
          data: {
            status: RequestStatus.APROVADA,
            adminId: actor.user.id,
            adminNotes: input.adminNotes ?? null,
            decidedAt: new Date(),
          },
        });
        const updatedVehicle = await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { currentStatus: VehicleStatus.RESERVADO },
        });
        return {
          request: updatedRequest,
          caution: newCaution,
          vehicle: updatedVehicle,
        };
      });
      break;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempts < MAX_PUBLIC_CODE_RETRIES
      ) {
        continue; // colisão de publicCode da cautela: tenta novamente
      }
      throw error;
    }
  }
  if (!result) {
    throw Errors.internal("Não foi possível gerar um código único de cautela.");
  }

  await recordAudit({
    action: "REQUEST_APPROVED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "VehicleRequest",
    entityId: id,
    metadata: {
      publicCode: result.request.publicCode,
      cautionCode: result.caution.publicCode,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
    },
    context,
  });

  // Notificação in-app + e-mail (best effort)
  await createNotification({
    userId: req!.userId,
    type: "REQUEST_APPROVED",
    title: "Solicitação aprovada",
    message: `Sua solicitação ${result.request.publicCode} foi aprovada. Veículo: ${vehicle.brand} ${vehicle.model} (${vehicle.plate}).`,
    relatedEntityType: "VehicleRequest",
    relatedEntityId: id,
  });

  void sendTransactionalEmail(
    buildRequestApproved({
      to: req!.user.email,
      fullName: req!.user.fullName,
      publicCode: result.request.publicCode,
      cautionCode: result.caution.publicCode,
      vehicleLabel: `${vehicle.brand} ${vehicle.model} — ${vehicle.plate}`,
      withdrawalDate: formatDateBr(result.request.withdrawalDate),
      withdrawalTime: result.request.withdrawalTime,
      returnDate: formatDateBr(result.request.returnDate),
      returnTime: result.request.returnTime,
      detailsUrl: `${env.APP_BASE_URL}/solicitacoes/${id}`,
      requestId: id,
    }),
  ).catch(() => undefined);

  return result;
}

// ----------------------------------------------------------------------------
// Recusa (admin)
// ----------------------------------------------------------------------------

export async function rejectRequest(
  id: string,
  input: RejectRequestInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<VehicleRequest> {
  const req = await prisma.vehicleRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  ensureRequestFound(req);
  if (req!.status !== RequestStatus.PENDENTE_ANALISE) {
    throw Errors.conflict("Esta solicitação não está mais em análise.");
  }

  const updated = await prisma.vehicleRequest.update({
    where: { id },
    data: {
      status: RequestStatus.NAO_APROVADA,
      adminId: actor.user.id,
      rejectionReason: input.rejectionReason,
      adminNotes: input.adminNotes ?? null,
      decidedAt: new Date(),
    },
  });

  await recordAudit({
    action: "REQUEST_REJECTED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "VehicleRequest",
    entityId: id,
    metadata: {
      publicCode: updated.publicCode,
      reason: input.rejectionReason,
    },
    context,
  });

  await createNotification({
    userId: req!.userId,
    type: "REQUEST_REJECTED",
    title: "Solicitação não aprovada",
    message: `Sua solicitação ${updated.publicCode} não foi aprovada. Motivo: ${input.rejectionReason}`,
    relatedEntityType: "VehicleRequest",
    relatedEntityId: id,
  });

  void sendTransactionalEmail(
    buildRequestRejected({
      to: req!.user.email,
      fullName: req!.user.fullName,
      publicCode: updated.publicCode,
      rejectionReason: input.rejectionReason,
      detailsUrl: `${env.APP_BASE_URL}/solicitacoes/${id}`,
      requestId: id,
    }),
  ).catch(() => undefined);

  return updated;
}

// ----------------------------------------------------------------------------
// Cancelamento pelo admin
// ----------------------------------------------------------------------------

export async function cancelRequestByAdmin(
  id: string,
  input: CancelRequestInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<VehicleRequest> {
  const req = await prisma.vehicleRequest.findUnique({ where: { id } });
  ensureRequestFound(req);
  if (req!.status !== RequestStatus.PENDENTE_ANALISE) {
    throw Errors.conflict(
      "Apenas solicitações em análise podem ser canceladas pelo administrador.",
    );
  }

  const updated = await prisma.vehicleRequest.update({
    where: { id },
    data: {
      status: RequestStatus.CANCELADA_PELO_ADMIN,
      adminId: actor.user.id,
      adminNotes: input.cancellationReason ?? null,
      decidedAt: new Date(),
    },
  });

  await recordAudit({
    action: "REQUEST_CANCELLED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "VehicleRequest",
    entityId: id,
    metadata: { by: "admin", publicCode: updated.publicCode },
    context,
  });

  return updated;
}
