import { Prisma, type Vehicle, type VehicleStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import type { SessionUser } from "@/server/modules/auth/session";
import {
  isWorkflowStatus,
  type ChangeStatusInput,
  type CreateVehicleInput,
  type ListVehiclesQuery,
  type UpdateVehicleInput,
} from "@/server/modules/vehicles/vehicle.schemas";

/**
 * Service de veículos. Toda a regra crítica (unicidade, transições de status,
 * auditoria) acontece aqui — as rotas apenas orquestram contexto e DTO.
 */

// ---------- Helpers ---------------------------------------------------------

function ensureFound<T>(value: T | null | undefined, label = "Veículo"): T {
  if (value === null || value === undefined) {
    throw Errors.notFound(`${label} não encontrado.`);
  }
  return value;
}

function mapUniqueViolation(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = (error.meta?.target as string[] | undefined)?.join(", ");
    if (target?.includes("plate")) {
      throw Errors.conflict("Já existe um veículo cadastrado com esta placa.");
    }
    if (target?.includes("internalCode")) {
      throw Errors.conflict("Já existe um veículo cadastrado com este código interno.");
    }
    throw Errors.conflict("Já existe um veículo com esses dados.");
  }
  throw error;
}

/** Calcula o diff superficial entre antes/depois para auditoria. */
function buildChangeMetadata<T extends Record<string, unknown>>(
  before: T,
  after: T,
  keys: readonly (keyof T)[],
): Prisma.InputJsonValue {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of keys) {
    if (before[key] !== after[key]) {
      changes[String(key)] = { from: before[key] ?? null, to: after[key] ?? null };
    }
  }
  return { changes } as Prisma.InputJsonValue;
}

// ---------- Operações ------------------------------------------------------

export async function createVehicle(
  input: CreateVehicleInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<Vehicle> {
  let vehicle: Vehicle;
  try {
    vehicle = await prisma.vehicle.create({
      data: {
        brand: input.brand,
        model: input.model,
        plate: input.plate,
        internalCode: input.internalCode ?? null,
        category: input.category,
        usageType: input.usageType,
        linkedSector: input.linkedSector ?? null,
        agency: input.agency ?? null,
        currentMileage: input.currentMileage,
        notes: input.notes ?? null,
      },
    });
  } catch (error) {
    mapUniqueViolation(error);
  }

  await recordAudit({
    action: "VEHICLE_CREATED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "Vehicle",
    entityId: vehicle.id,
    metadata: {
      plate: vehicle.plate,
      category: vehicle.category,
      usageType: vehicle.usageType,
    },
    context,
  });

  return vehicle;
}

export interface ListVehiclesResult {
  items: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listVehicles(query: ListVehiclesQuery): Promise<ListVehiclesResult> {
  const where: Prisma.VehicleWhereInput = {
    deletedAt: null,
  };
  if (query.category) where.category = query.category;
  if (query.usageType) where.usageType = query.usageType;
  if (query.status) where.currentStatus = query.status;
  if (typeof query.active === "boolean") where.active = query.active;
  if (query.search) {
    const term = query.search.trim();
    where.OR = [
      { plate: { contains: term.toUpperCase() } },
      { model: { contains: term, mode: "insensitive" } },
      { brand: { contains: term, mode: "insensitive" } },
      { internalCode: { contains: term.toUpperCase() } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy: [{ category: "asc" }, { model: "asc" }, { plate: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getVehicleById(id: string): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
  });
  return ensureFound(vehicle);
}

const UPDATABLE_KEYS = [
  "brand",
  "model",
  "plate",
  "internalCode",
  "category",
  "usageType",
  "linkedSector",
  "agency",
  "currentMileage",
  "notes",
  "active",
] as const;

export async function updateVehicle(
  id: string,
  input: UpdateVehicleInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<Vehicle> {
  const before = await getVehicleById(id);

  // Monta data ignorando chaves não enviadas (undefined). Strings vazias em
  // campos nullable já foram convertidas para null pelos schemas.
  const data: Prisma.VehicleUpdateInput = {};
  for (const key of UPDATABLE_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (value === undefined) continue;
    (data as Record<string, unknown>)[key] = value;
  }

  let updated: Vehicle;
  try {
    updated = await prisma.vehicle.update({ where: { id }, data });
  } catch (error) {
    mapUniqueViolation(error);
  }

  await recordAudit({
    action: "VEHICLE_UPDATED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "Vehicle",
    entityId: id,
    metadata: buildChangeMetadata(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      UPDATABLE_KEYS as readonly string[] as readonly (keyof Record<string, unknown>)[],
    ),
    context,
  });

  return updated;
}

/**
 * Mudança de status controlada por admin. Bloqueia alteração quando o veículo
 * está em um estado de fluxo (RESERVADO/EM_USO/...). O schema já garante que o
 * `targetStatus` é um dos estados administrativos.
 */
export async function changeVehicleStatus(
  id: string,
  input: ChangeStatusInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<Vehicle> {
  const before = await getVehicleById(id);

  if (isWorkflowStatus(before.currentStatus)) {
    throw Errors.conflict(
      "Não é possível alterar o status manualmente: o veículo está em ciclo de cautela.",
    );
  }

  if (before.currentStatus === input.targetStatus) {
    return before;
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      currentStatus: input.targetStatus,
      // Quando inativa ou baixa, marca `active=false`. Reativação volta a true.
      active: input.targetStatus === "BAIXADO" || input.targetStatus === "INATIVO" ? false : true,
    },
  });

  const specificAction =
    input.targetStatus === "BLOQUEADO"
      ? "VEHICLE_BLOCKED"
      : before.currentStatus === "BLOQUEADO" && input.targetStatus === "DISPONIVEL"
        ? "VEHICLE_UNBLOCKED"
        : "VEHICLE_STATUS_CHANGED";

  await recordAudit({
    action: specificAction,
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "Vehicle",
    entityId: id,
    metadata: {
      from: before.currentStatus,
      to: input.targetStatus,
      reason: input.reason,
    },
    context,
  });

  return updated;
}

export interface VehicleHistoryEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  metadata: Prisma.JsonValue;
  createdAt: string;
}

export async function getVehicleHistory(id: string, limit = 50): Promise<VehicleHistoryEntry[]> {
  await getVehicleById(id); // garante existência (404 amigável)

  const logs = await prisma.auditLog.findMany({
    where: { entityType: "Vehicle", entityId: id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    actorUserId: log.actorUserId,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  }));
}

/**
 * Variante usada pelo importador da planilha — não exige actor (rodado fora
 * de sessão HTTP) e é idempotente por placa.
 */
export async function upsertVehicleByPlate(
  input: CreateVehicleInput & { initialStatus?: VehicleStatus; active?: boolean },
): Promise<{ vehicle: Vehicle; created: boolean }> {
  const existing = await prisma.vehicle.findUnique({
    where: { plate: input.plate },
  });
  if (existing) {
    return { vehicle: existing, created: false };
  }
  const vehicle = await prisma.vehicle.create({
    data: {
      brand: input.brand,
      model: input.model,
      plate: input.plate,
      internalCode: input.internalCode ?? null,
      category: input.category,
      usageType: input.usageType,
      linkedSector: input.linkedSector ?? null,
      agency: input.agency ?? null,
      currentMileage: input.currentMileage,
      notes: input.notes ?? null,
      currentStatus: input.initialStatus ?? "DISPONIVEL",
      active: input.active ?? true,
    },
  });
  return { vehicle, created: true };
}
