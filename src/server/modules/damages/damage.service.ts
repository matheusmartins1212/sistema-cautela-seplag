import {
  DamageStatus,
  Prisma,
  type DamageReport,
  type Prisma as PrismaT,
  type Vehicle,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import type { SessionUser } from "@/server/modules/auth/session";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import type { CreateDamageInput, ListDamagesQuery, UpdateDamageInput } from "./damage.schemas";

type DamageWithVehicle = DamageReport & { vehicle?: Vehicle };
type PrismaLike = typeof prisma | PrismaT.TransactionClient;

export async function createDamage(
  input: CreateDamageInput,
  actor: SessionUser,
  context?: RequestContext,
  client: PrismaLike = prisma,
): Promise<DamageReport> {
  const vehicle = await client.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
  });
  if (!vehicle) throw Errors.notFound("Veículo não encontrado.");

  const damage = await client.damageReport.create({
    data: {
      vehicleId: input.vehicleId,
      cautionId: input.cautionId ?? null,
      checklistId: input.checklistId ?? null,
      description: input.description,
      severity: input.severity,
      createdByUserId: actor.user.id,
    },
  });

  await recordAudit({
    action: "STATUS_CHANGED", // reuso de action; futuro: DAMAGE_REPORTED
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "DamageReport",
    entityId: damage.id,
    metadata: {
      severity: damage.severity,
      vehicleId: damage.vehicleId,
      event: "damage_created",
    },
    context,
  });

  return damage;
}

export interface ListDamagesResult {
  items: DamageWithVehicle[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listDamages(query: ListDamagesQuery): Promise<ListDamagesResult> {
  const where: Prisma.DamageReportWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.severity) where.severity = query.severity;
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.cautionId) where.cautionId = query.cautionId;

  const [total, items] = await prisma.$transaction([
    prisma.damageReport.count({ where }),
    prisma.damageReport.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { vehicle: true },
    }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getDamageById(id: string): Promise<DamageWithVehicle> {
  const damage = await prisma.damageReport.findUnique({
    where: { id },
    include: { vehicle: true },
  });
  if (!damage) throw Errors.notFound("Avaria não encontrada.");
  return damage;
}

export async function updateDamage(
  id: string,
  input: UpdateDamageInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<DamageReport> {
  const current = await prisma.damageReport.findUnique({ where: { id } });
  if (!current) throw Errors.notFound("Avaria não encontrada.");

  const updated = await prisma.damageReport.update({
    where: { id },
    data: {
      description: input.description,
      severity: input.severity,
      status: input.status,
      reviewedByAdminId:
        input.status && input.status !== DamageStatus.ABERTA
          ? actor.user.id
          : current.reviewedByAdminId,
    },
  });

  await recordAudit({
    action: "STATUS_CHANGED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "DamageReport",
    entityId: id,
    metadata: {
      from: current.status,
      to: updated.status,
      event: "damage_updated",
    },
    context,
  });

  // Ao colocar a avaria EM_ANALISE, notifica o dono da cautela relacionada
  // (best effort; só quando a avaria está vinculada a uma cautela).
  if (
    updated.status === DamageStatus.EM_ANALISE &&
    current.status !== DamageStatus.EM_ANALISE &&
    updated.cautionId
  ) {
    const caution = await prisma.caution.findUnique({
      where: { id: updated.cautionId },
      select: { userId: true },
    });
    if (caution) {
      await createNotification({
        userId: caution.userId,
        type: "DAMAGE_UNDER_REVIEW",
        title: "Avaria em análise",
        message: "Uma avaria relacionada à sua cautela está em análise pela administração.",
        relatedEntityType: "Caution",
        relatedEntityId: updated.cautionId,
      });
    }
  }

  return updated;
}
