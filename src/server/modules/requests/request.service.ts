import {
  CautionStatus,
  Prisma,
  RequestStatus,
  UserRole,
  UserStatus,
  VehicleStatus,
  type Caution,
  type User,
  type Vehicle,
  type VehicleRequest,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { isWorkflowStatus } from "@/server/modules/vehicles/vehicle.schemas";
import { env } from "@/server/config/env";
import { type AppError, Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import { generateCautionCode, generateRequestCode } from "@/server/lib/public-code";
import { isAdmin } from "@/server/modules/auth/rbac";
import type { SessionUser } from "@/server/modules/auth/session";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import { sendEmailAfterResponse } from "@/server/modules/email/email.service";
import {
  buildRequestApproved,
  buildRequestReceived,
  buildRequestRejected,
  buildTripAssigned,
} from "@/server/modules/email/templates/request-templates";
import { isActiveAgency, listActiveAgencies } from "@/server/modules/agencies/agency.service";
import { responsibleWhere } from "@/server/modules/cautions/responsible";
import {
  deriveShift,
  type ApproveRequestInput,
  type CancelRequestInput,
  type CreateRequestInput,
  type ListAdminRequestsQuery,
  type ListMyRequestsQuery,
  type RejectRequestInput,
} from "@/server/modules/requests/request.schemas";
import { toAppWallClock } from "@/shared/time";
import { VEHICLE_STATUS_LABEL } from "@/components/vehicles/labels";

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

/**
 * Órgão solicitante. Vem do cadastro do usuário; contas antigas, sem órgão,
 * informam no primeiro pedido e o valor passa a valer para a conta. Enquanto
 * o catálogo estiver vazio, o órgão fica em branco (central ainda não configurou).
 */
async function resolveRequesterAgency(
  actor: SessionUser,
  informed: string | null | undefined,
): Promise<string | null> {
  if (actor.user.agency) return actor.user.agency;

  if (informed) {
    if (!(await isActiveAgency(informed))) {
      throw Errors.validation("Órgão inválido.", { agency: ["Selecione um órgão da lista."] });
    }
    await prisma.user.update({ where: { id: actor.user.id }, data: { agency: informed } });
    return informed;
  }

  const catalog = await listActiveAgencies();
  if (catalog.length > 0) {
    throw Errors.validation("Informe o órgão solicitante.", {
      agency: ["Selecione o seu órgão."],
    });
  }
  return null;
}

export async function createRequest(
  input: CreateRequestInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<VehicleRequest> {
  const withdrawalDate = parseIsoDate(input.withdrawalDate);
  const returnDate = parseIsoDate(input.returnDate);
  const requestingAgency = await resolveRequesterAgency(actor, input.agency);
  const passengers = input.passengers ?? [];

  let created: VehicleRequest | null = null;
  let attempts = 0;
  // Retry curto contra colisão de publicCode (P2002 no índice único).
  while (attempts < MAX_PUBLIC_CODE_RETRIES) {
    attempts++;
    try {
      created = await prisma.vehicleRequest.create({
        data: {
          publicCode: generateRequestCode(toAppWallClock(new Date())),
          userId: actor.user.id,
          withdrawalDate,
          returnDate,
          shift: input.shift ?? deriveShift(input),
          withdrawalTime: input.withdrawalTime,
          returnTime: input.returnTime,
          withDriver: input.withDriver,
          origin: input.origin ?? null,
          destination: input.destination,
          reason: input.reason,
          // Lista de nomes vira contagem + um nome por linha (colunas existentes).
          passengerCount: passengers.length > 0 ? passengers.length : null,
          passengerNames: passengers.length > 0 ? passengers.join("\n") : null,
          contactPhone: input.contactPhone ?? actor.user.phone,
          requestingAgency,
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
      agency: requestingAgency,
    },
    context,
  });

  // E-mail de confirmação (best effort — não derruba a criação)
  sendEmailAfterResponse(
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
  );

  return created;
}

// ----------------------------------------------------------------------------
// Listagens
// ----------------------------------------------------------------------------

type RequestWithRelations = VehicleRequest & {
  user?: User;
  caution?: (Caution & { vehicle?: Vehicle; driver?: User | null }) | null;
};

const CAUTION_WITH_VEHICLE_AND_DRIVER = {
  include: { vehicle: true, driver: true },
} satisfies Prisma.VehicleRequest$cautionArgs;

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
      include: { caution: CAUTION_WITH_VEHICLE_AND_DRIVER },
    }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function listAllRequests(query: ListAdminRequestsQuery): Promise<ListRequestsResult> {
  const where: Prisma.VehicleRequestWhereInput = { ...statusFilter(query.status) };
  if (query.userId) where.userId = query.userId;
  if (query.agency) where.requestingAgency = query.agency;
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
      { origin: { contains: term, mode: "insensitive" } },
      { reason: { contains: term, mode: "insensitive" } },
      { requestingAgency: { contains: term, mode: "insensitive" } },
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
        caution: CAUTION_WITH_VEHICLE_AND_DRIVER,
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
      caution: CAUTION_WITH_VEHICLE_AND_DRIVER,
    },
  });
  ensureRequestFound(req);
  ensureCanRead(req as VehicleRequest, actor);
  return req as RequestWithRelations;
}

/**
 * Grava a decisão só se o pedido ainda estiver em análise. Duas pessoas agindo
 * ao mesmo tempo (o servidor cancela enquanto a central recusa, por exemplo):
 * a segunda espera a primeira terminar, não encontra mais o pedido em análise e
 * recebe "conflito", em vez de sobrescrever a decisão.
 */
async function decidePendingRequest(
  id: string,
  data: Prisma.VehicleRequestUncheckedUpdateManyInput,
  conflictMessage: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<VehicleRequest> {
  const { count } = await db.vehicleRequest.updateMany({
    where: { id, status: RequestStatus.PENDENTE_ANALISE },
    data,
  });
  if (count !== 1) throw Errors.conflict(conflictMessage);
  return db.vehicleRequest.findUniqueOrThrow({ where: { id } });
}

/**
 * Bloqueio exclusivo, até o fim da transação, de cada recurso disputado
 * (veículo, condutor). Aprovações que disputam o mesmo recurso passam a rodar
 * uma depois da outra, e a segunda já enxerga a viagem criada pela primeira.
 * Ordem fixa das chaves para não haver impasse entre duas transações.
 */
async function lockResources(tx: Prisma.TransactionClient, keys: string[]): Promise<void> {
  for (const key of [...new Set(keys)].sort()) {
    await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))) AS l`;
  }
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

  const updated = await decidePendingRequest(
    id,
    {
      status: RequestStatus.CANCELADA_PELO_USUARIO,
      adminNotes: input.cancellationReason ?? null,
      decidedAt: new Date(),
    },
    "Apenas solicitações ainda em análise podem ser canceladas.",
  );

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

/** Cautelas que ocupam o veículo no período planejado. */
const BLOCKING_CAUTION_STATUSES: readonly CautionStatus[] = [
  CautionStatus.AGUARDANDO_RETIRADA,
  CautionStatus.RETIRADA_EM_ANDAMENTO,
  CautionStatus.EM_USO,
  CautionStatus.AGUARDANDO_DEVOLUCAO,
  CautionStatus.DEVOLUCAO_EM_ANALISE,
  CautionStatus.ATRASADA,
];

export interface VehicleOptionForRequest {
  id: string;
  brand: string;
  model: string;
  plate: string;
  category: Vehicle["category"];
  currentStatus: VehicleStatus;
  /** Código da cautela que ocupa o veículo no período pedido, se houver. */
  conflictCode: string | null;
}

/**
 * Veículos que o admin pode escolher ao aprovar uma solicitação: os
 * disponíveis e também os que estão em ciclo de cautela, porque uma reserva
 * para outra data não impede a aprovação. Os que têm choque de período vêm
 * marcados com o código da cautela que os ocupa.
 */
export async function listVehicleOptionsForRequest(
  requestId: string,
): Promise<VehicleOptionForRequest[]> {
  const req = await prisma.vehicleRequest.findUnique({ where: { id: requestId } });
  ensureRequestFound(req);
  const start = combineDateTime(req!.withdrawalDate, req!.withdrawalTime);
  const end = combineDateTime(req!.returnDate, req!.returnTime);

  const vehicles = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
      active: true,
      currentStatus: {
        in: [
          VehicleStatus.DISPONIVEL,
          ...Object.values(VehicleStatus).filter((st) => isWorkflowStatus(st)),
        ],
      },
    },
    orderBy: [{ model: "asc" }],
    include: {
      cautions: {
        where: { status: { in: [...BLOCKING_CAUTION_STATUSES] } },
        select: { publicCode: true, plannedWithdrawalAt: true, plannedReturnAt: true },
      },
    },
  });

  return vehicles
    .map((v) => {
      const conflict = v.cautions.find((c) =>
        hasDateRangeConflict(start, end, c.plannedWithdrawalAt, c.plannedReturnAt),
      );
      return {
        id: v.id,
        brand: v.brand,
        model: v.model,
        plate: v.plate,
        category: v.category,
        currentStatus: v.currentStatus,
        conflictCode: conflict?.publicCode ?? null,
      };
    })
    .sort((a, b) => Number(a.conflictCode !== null) - Number(b.conflictCode !== null));
}

export interface DriverOptionForRequest {
  id: string;
  fullName: string;
  phone: string;
  driverLicenseCategory: string | null;
  driverLicenseExpiresAt: Date | null;
  /** Código da viagem que já ocupa o condutor no período pedido, se houver. */
  conflictCode: string | null;
  /** CNH vencida antes do fim da viagem: não pode ser escalado. */
  licenseExpired: boolean;
}

/**
 * Condutores que a central pode escalar: usuários ativos marcados como
 * condutor. Os ocupados no período ou com CNH vencida vêm sinalizados.
 */
export async function listDriverOptionsForRequest(
  requestId: string,
): Promise<DriverOptionForRequest[]> {
  const req = await prisma.vehicleRequest.findUnique({ where: { id: requestId } });
  ensureRequestFound(req);
  const start = combineDateTime(req!.withdrawalDate, req!.withdrawalTime);
  const end = combineDateTime(req!.returnDate, req!.returnTime);

  const drivers = await prisma.user.findMany({
    // Só perfis de usuário: administradores não acessam a área onde ficam os
    // checklists do condutor.
    where: { isDriver: true, role: UserRole.USER, status: UserStatus.ACTIVE, deletedAt: null },
    orderBy: [{ fullName: "asc" }],
    include: {
      drivenCautions: {
        where: { status: { in: [...BLOCKING_CAUTION_STATUSES] } },
        select: { publicCode: true, plannedWithdrawalAt: true, plannedReturnAt: true },
      },
    },
  });

  return drivers
    .map((d) => {
      const conflict = d.drivenCautions.find((c) =>
        hasDateRangeConflict(start, end, c.plannedWithdrawalAt, c.plannedReturnAt),
      );
      return {
        id: d.id,
        fullName: d.fullName,
        phone: d.phone,
        driverLicenseCategory: d.driverLicenseCategory,
        driverLicenseExpiresAt: d.driverLicenseExpiresAt,
        conflictCode: conflict?.publicCode ?? null,
        licenseExpired: isLicenseExpiredFor(d.driverLicenseExpiresAt, req!.returnDate),
      };
    })
    .sort(
      (a, b) =>
        Number(a.conflictCode !== null || a.licenseExpired) -
        Number(b.conflictCode !== null || b.licenseExpired),
    );
}

/** CNH precisa estar válida até o último dia da viagem. Sem data informada, não bloqueia. */
export function isLicenseExpiredFor(expiresAt: Date | null, lastTripDay: Date): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < lastTripDay.getTime();
}

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

/**
 * Mensagem de conflito de agenda. Se a viagem que ocupa o período nasceu deste
 * mesmo pedido, ele acabou de ser aprovado por outra pessoa (ou por um segundo
 * clique): avisa isso, e não "veículo ocupado".
 */
function scheduleConflict(
  who: "Veículo" | "Condutor",
  requestId: string,
  c: { publicCode: string; requestId: string | null },
): AppError {
  if (c.requestId === requestId) {
    return Errors.conflict("Esta solicitação não está mais em análise.");
  }
  return Errors.conflict(`${who} já tem viagem no período (${c.publicCode}).`);
}

/**
 * Confere, com os dados da transação, se veículo e condutor continuam livres no
 * período. Roda depois de `lockResources`, então enxerga as viagens gravadas por
 * aprovações concorrentes que terminaram antes.
 */
async function assertScheduleFree(
  db: Prisma.TransactionClient,
  args: { requestId: string; vehicleId: string; driverId: string | null; start: Date; end: Date },
): Promise<void> {
  const vehicleTrips = await db.caution.findMany({
    where: { vehicleId: args.vehicleId, status: { in: [...BLOCKING_CAUTION_STATUSES] } },
    select: { plannedWithdrawalAt: true, plannedReturnAt: true, publicCode: true, requestId: true },
  });
  for (const c of vehicleTrips) {
    if (hasDateRangeConflict(args.start, args.end, c.plannedWithdrawalAt, c.plannedReturnAt)) {
      throw scheduleConflict("Veículo", args.requestId, c);
    }
  }
  if (!args.driverId) return;
  const driverTrips = await db.caution.findMany({
    where: { ...responsibleWhere(args.driverId), status: { in: [...BLOCKING_CAUTION_STATUSES] } },
    select: { plannedWithdrawalAt: true, plannedReturnAt: true, publicCode: true, requestId: true },
  });
  for (const c of driverTrips) {
    if (hasDateRangeConflict(args.start, args.end, c.plannedWithdrawalAt, c.plannedReturnAt)) {
      throw scheduleConflict("Condutor", args.requestId, c);
    }
  }
}

export interface ApproveRequestResult {
  request: VehicleRequest;
  caution: Caution;
  vehicle: Vehicle;
  /** Nulo quando o próprio solicitante dirige (cautela tradicional). */
  driver: User | null;
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
  // Disponível ou dentro do fluxo de cautelas (reservado, em uso, em conferência):
  // reservas futuras podem ser aprovadas enquanto o carro está fora, desde que
  // não haja choque de período (checado abaixo). Manutenção, bloqueio, baixa e
  // inatividade impedem a aprovação.
  if (
    vehicle.currentStatus !== VehicleStatus.DISPONIVEL &&
    !isWorkflowStatus(vehicle.currentStatus)
  ) {
    throw Errors.conflict(
      `Veículo não está disponível (situação atual: ${VEHICLE_STATUS_LABEL[vehicle.currentStatus].toLowerCase()}).`,
    );
  }

  const newPeriodStart = combineDateTime(req!.withdrawalDate, req!.withdrawalTime);
  const newPeriodEnd = combineDateTime(req!.returnDate, req!.returnTime);

  // Conflito com outras viagens ativas do mesmo veículo
  const overlapping = await prisma.caution.findMany({
    where: {
      vehicleId: vehicle.id,
      status: { in: [...BLOCKING_CAUTION_STATUSES] },
    },
    select: { plannedWithdrawalAt: true, plannedReturnAt: true, publicCode: true, requestId: true },
  });
  for (const c of overlapping) {
    if (
      hasDateRangeConflict(newPeriodStart, newPeriodEnd, c.plannedWithdrawalAt, c.plannedReturnAt)
    ) {
      throw scheduleConflict("Veículo", id, c);
    }
  }

  // Condutor: obrigatório quando o pedido foi "com condutor"; opcional quando o
  // próprio solicitante ia dirigir (a central pode preferir mandar um condutor).
  // Se houver, precisa estar ativo, habilitado, com CNH válida até o fim da
  // viagem e livre no período.
  if (req!.withDriver && !input.driverId) {
    throw Errors.validation("Esta solicitação pediu condutor. Selecione o condutor.", {
      driverId: ["Selecione o condutor."],
    });
  }
  let driver: User | null = null;
  if (input.driverId) {
    driver = await prisma.user.findFirst({
      where: { id: input.driverId, deletedAt: null },
    });
    if (!driver || !driver.isDriver) throw Errors.notFound("Condutor não encontrado.");
    if (driver.role !== UserRole.USER) {
      throw Errors.conflict(
        "Condutor precisa ter perfil de usuário: o painel administrativo não preenche checklists.",
      );
    }
    if (driver.status !== UserStatus.ACTIVE) {
      throw Errors.conflict("Condutor está com o acesso inativo ou bloqueado.");
    }
    if (isLicenseExpiredFor(driver.driverLicenseExpiresAt, req!.returnDate)) {
      throw Errors.conflict("A CNH do condutor vence antes do fim da viagem.");
    }
    // Conta também cautelas em que ele mesmo dirigia (sem condutor).
    const driverTrips = await prisma.caution.findMany({
      where: {
        ...responsibleWhere(driver.id),
        status: { in: [...BLOCKING_CAUTION_STATUSES] },
      },
      select: {
        plannedWithdrawalAt: true,
        plannedReturnAt: true,
        publicCode: true,
        requestId: true,
      },
    });
    for (const c of driverTrips) {
      if (
        hasDateRangeConflict(newPeriodStart, newPeriodEnd, c.plannedWithdrawalAt, c.plannedReturnAt)
      ) {
        throw scheduleConflict("Condutor", id, c);
      }
    }
  }

  // Transação: cria a cautela, atualiza a solicitação e o status do veículo.
  let attempts = 0;
  let result: ApproveRequestResult | null = null;
  while (attempts < MAX_PUBLIC_CODE_RETRIES) {
    attempts++;
    try {
      result = await prisma.$transaction(async (tx) => {
        // Uma aprovação por vez para o mesmo veículo e o mesmo condutor; a
        // checagem de agenda refeita aqui é a que vale.
        await lockResources(tx, [
          `vehicle:${vehicle.id}`,
          ...(driver ? [`person:${driver.id}`] : []),
        ]);
        // Só aprova se ninguém decidiu antes (duplo clique, recusa ou
        // cancelamento ao mesmo tempo).
        const updatedRequest = await decidePendingRequest(
          id,
          {
            status: RequestStatus.APROVADA,
            adminId: actor.user.id,
            adminNotes: input.adminNotes ?? null,
            decidedAt: new Date(),
          },
          "Esta solicitação não está mais em análise.",
          tx,
        );
        await assertScheduleFree(tx, {
          requestId: id,
          vehicleId: vehicle.id,
          driverId: driver?.id ?? null,
          start: newPeriodStart,
          end: newPeriodEnd,
        });
        const newCaution = await tx.caution.create({
          data: {
            publicCode: generateCautionCode(toAppWallClock(new Date())),
            requestId: id,
            userId: req!.userId,
            driverId: driver?.id ?? null,
            vehicleId: vehicle.id,
            status: CautionStatus.AGUARDANDO_RETIRADA,
            approvedByAdminId: actor.user.id,
            plannedWithdrawalAt: newPeriodStart,
            plannedReturnAt: newPeriodEnd,
          },
        });
        // Só um carro livre passa a "Reservado"; se ele está em uso ou em
        // conferência, esse estado físico prevalece até a devolução.
        const updatedVehicle =
          vehicle.currentStatus === VehicleStatus.DISPONIVEL
            ? await tx.vehicle.update({
                where: { id: vehicle.id },
                data: { currentStatus: VehicleStatus.RESERVADO },
              })
            : vehicle;
        return {
          request: updatedRequest,
          caution: newCaution,
          vehicle: updatedVehicle,
          driver,
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
    throw Errors.internal("Não foi possível gerar um código único de viagem.");
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
      driverId: driver?.id ?? null,
      withDriver: driver !== null,
    },
    context,
  });

  const vehicleLabel = `${vehicle.brand} ${vehicle.model} — ${vehicle.plate}`;

  // Solicitante: aprovação com o veículo e, se houver, o condutor (best effort).
  await createNotification({
    userId: req!.userId,
    type: "REQUEST_APPROVED",
    title: driver ? "Transporte confirmado" : "Solicitação aprovada",
    message: driver
      ? `Sua solicitação ${result.request.publicCode} foi aprovada. Veículo: ${vehicle.brand} ${vehicle.model} (${vehicle.plate}). Condutor: ${driver.fullName}, ${driver.phone}.`
      : `Sua solicitação ${result.request.publicCode} foi aprovada. Veículo: ${vehicle.brand} ${vehicle.model} (${vehicle.plate}). Na retirada, preencha o checklist de saída.`,
    relatedEntityType: "VehicleRequest",
    relatedEntityId: id,
  });

  sendEmailAfterResponse(
    buildRequestApproved({
      to: req!.user.email,
      fullName: req!.user.fullName,
      publicCode: result.request.publicCode,
      cautionCode: result.caution.publicCode,
      vehicleLabel,
      driverName: driver?.fullName ?? null,
      driverPhone: driver?.phone ?? null,
      withdrawalDate: formatDateBr(result.request.withdrawalDate),
      withdrawalTime: result.request.withdrawalTime,
      returnDate: formatDateBr(result.request.returnDate),
      returnTime: result.request.returnTime,
      detailsUrl: `${env.APP_BASE_URL}/solicitacoes/${id}`,
      requestId: id,
    }),
  );

  if (driver) {
    // Condutor: aviso da nova viagem (best effort).
    await createNotification({
      userId: driver.id,
      type: "TRIP_ASSIGNED",
      title: "Nova viagem",
      message: `Você foi escalado para a viagem ${result.caution.publicCode}: saída ${formatDateBr(result.request.withdrawalDate)} às ${result.request.withdrawalTime}, destino ${result.request.destination}.`,
      relatedEntityType: "Caution",
      relatedEntityId: result.caution.id,
    });

    sendEmailAfterResponse(
      buildTripAssigned({
        to: driver.email,
        fullName: driver.fullName,
        cautionCode: result.caution.publicCode,
        vehicleLabel,
        origin: result.request.origin ?? "local a combinar com a central",
        destination: result.request.destination,
        passengerCount: result.request.passengerCount,
        requesterName: req!.user.fullName,
        requesterAgency: result.request.requestingAgency,
        contactPhone: result.request.contactPhone ?? req!.user.phone,
        withdrawalDate: formatDateBr(result.request.withdrawalDate),
        withdrawalTime: result.request.withdrawalTime,
        returnDate: formatDateBr(result.request.returnDate),
        returnTime: result.request.returnTime,
        detailsUrl: `${env.APP_BASE_URL}/cautelas/${result.caution.id}`,
        cautionId: result.caution.id,
      }),
    );
  }

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

  const updated = await decidePendingRequest(
    id,
    {
      status: RequestStatus.NAO_APROVADA,
      adminId: actor.user.id,
      rejectionReason: input.rejectionReason,
      adminNotes: input.adminNotes ?? null,
      decidedAt: new Date(),
    },
    "Esta solicitação não está mais em análise.",
  );

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

  sendEmailAfterResponse(
    buildRequestRejected({
      to: req!.user.email,
      fullName: req!.user.fullName,
      publicCode: updated.publicCode,
      rejectionReason: input.rejectionReason,
      detailsUrl: `${env.APP_BASE_URL}/solicitacoes/${id}`,
      requestId: id,
    }),
  );

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

  const updated = await decidePendingRequest(
    id,
    {
      status: RequestStatus.CANCELADA_PELO_ADMIN,
      adminId: actor.user.id,
      adminNotes: input.cancellationReason ?? null,
      decidedAt: new Date(),
    },
    "Apenas solicitações em análise podem ser canceladas pelo administrador.",
  );

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
