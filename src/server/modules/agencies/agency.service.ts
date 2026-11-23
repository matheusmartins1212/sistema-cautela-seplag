import { Prisma, type Agency } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import type { SessionUser } from "@/server/modules/auth/session";
import type { CreateAgencyInput, UpdateAgencyInput } from "./agency.schemas";

/**
 * Catálogo de órgãos atendidos pela central. Usuários e solicitações guardam o
 * NOME do órgão (texto), como os demais catálogos, para preservar o histórico
 * mesmo que o órgão seja desativado depois.
 */

export async function listActiveAgencies(): Promise<Pick<Agency, "id" | "name">[]> {
  return prisma.agency.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

export async function listAllAgencies(): Promise<Agency[]> {
  return prisma.agency.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
}

/** Confirma que o nome informado é um órgão ativo do catálogo. */
export async function isActiveAgency(name: string): Promise<boolean> {
  const found = await prisma.agency.findFirst({
    where: { name, active: true },
    select: { id: true },
  });
  return found !== null;
}

export async function createAgency(
  input: CreateAgencyInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<Agency> {
  let created: Agency;
  try {
    created = await prisma.agency.create({ data: { name: input.name } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw Errors.conflict("Já existe um órgão com esse nome.");
    }
    throw error;
  }

  await recordAudit({
    action: "AGENCY_CREATED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "Agency",
    entityId: created.id,
    metadata: { name: created.name },
    context,
  });
  return created;
}

export async function updateAgency(
  id: string,
  input: UpdateAgencyInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<Agency> {
  const current = await prisma.agency.findUnique({ where: { id } });
  if (!current) throw Errors.notFound("Órgão não encontrado.");

  const updated = await prisma.agency.update({ where: { id }, data: { active: input.active } });

  await recordAudit({
    action: "AGENCY_UPDATED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "Agency",
    entityId: id,
    metadata: { name: current.name, from: current.active, to: input.active },
    context,
  });
  return updated;
}
