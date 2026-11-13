import {
  CautionStatus,
  ChecklistStatus,
  ChecklistType,
  VehicleStatus,
  type Caution,
  type Checklist,
  type ChecklistItem,
  type Vehicle,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import { isAdmin } from "@/server/modules/auth/rbac";
import type { SessionUser } from "@/server/modules/auth/session";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import type {
  ReviewChecklistInput,
  SaveChecklistDraftInput,
  SubmitChecklistInput,
} from "./checklist.schemas";

const CHECKLIST_TYPE_LABEL: Record<ChecklistType, string> = {
  RETIRADA: "retirada",
  DEVOLUCAO: "devolução",
};

type ChecklistWithItems = Checklist & { items: ChecklistItem[] };

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function ensureFound<T>(value: T | null | undefined, label = "Checklist"): T {
  if (value === null || value === undefined) {
    throw Errors.notFound(`${label} não encontrado.`);
  }
  return value;
}

function ensureCanRead(c: Checklist, actor: SessionUser): void {
  if (c.userId !== actor.user.id && !isAdmin(actor.user.role)) {
    throw Errors.notFound("Checklist não encontrado.");
  }
}

function ensureCanWrite(c: Checklist, actor: SessionUser): void {
  if (c.userId !== actor.user.id) {
    throw Errors.notFound("Checklist não encontrado.");
  }
  if (c.status !== ChecklistStatus.PENDENTE && c.status !== ChecklistStatus.EM_PREENCHIMENTO) {
    throw Errors.conflict("Checklist já enviado — não pode mais ser editado pelo usuário.");
  }
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

// ----------------------------------------------------------------------------
// Inicialização do checklist (instancia items do template)
// ----------------------------------------------------------------------------

/**
 * Garante que existe um checklist do tipo solicitado para a cautela e instancia
 * os itens a partir do `ChecklistItemTemplate` aplicáveis (gerais + categoria
 * do veículo). Idempotente — chamadas repetidas reaproveitam o existente.
 */
export async function initializeChecklist(
  caution: Caution & { vehicle: Vehicle },
  type: ChecklistType,
  actor?: SessionUser,
  context?: RequestContext,
): Promise<ChecklistWithItems> {
  const existing = await prisma.checklist.findUnique({
    where: { cautionId_type: { cautionId: caution.id, type } },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (existing) return existing;

  const templates = await prisma.checklistItemTemplate.findMany({
    where: {
      active: true,
      OR: [{ category: null }, { category: caution.vehicle.category }],
    },
    orderBy: { sortOrder: "asc" },
  });

  const created = await prisma.$transaction(async (tx) => {
    const checklist = await tx.checklist.create({
      data: {
        cautionId: caution.id,
        vehicleId: caution.vehicleId,
        userId: caution.userId,
        type,
        status: ChecklistStatus.PENDENTE,
        items: {
          create: templates.map((t) => ({
            itemKey: t.itemKey,
            itemLabel: t.label,
            category: t.category,
            requiresPhoto: t.requiresPhotoOnIssue,
          })),
        },
      },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    return checklist;
  });

  if (actor) {
    await recordAudit({
      action: "CHECKLIST_STARTED",
      actorUserId: actor.user.id,
      actorRole: actor.user.role,
      entityType: "Checklist",
      entityId: created.id,
      metadata: { type, cautionId: caution.id, vehicleId: caution.vehicleId },
      context,
    });
  }

  return created;
}

// ----------------------------------------------------------------------------
// Leitura (escopada por cautela + autorização)
// ----------------------------------------------------------------------------

async function loadCautionForUser(
  cautionId: string,
  actor: SessionUser,
): Promise<Caution & { vehicle: Vehicle }> {
  const caution = await prisma.caution.findUnique({
    where: { id: cautionId },
    include: { vehicle: true },
  });
  ensureFound(caution, "Cautela");
  if ((caution as Caution).userId !== actor.user.id && !isAdmin(actor.user.role)) {
    throw Errors.notFound("Cautela não encontrada.");
  }
  return caution as Caution & { vehicle: Vehicle };
}

/**
 * Retorna (ou cria) o checklist do tipo informado para a cautela. Usuário comum
 * só consegue se for o dono da cautela. Admin pode iniciar/ler de qualquer.
 */
export async function getOrInitChecklistForCaution(
  cautionId: string,
  type: ChecklistType,
  actor: SessionUser,
  context?: RequestContext,
): Promise<ChecklistWithItems> {
  const caution = await loadCautionForUser(cautionId, actor);
  // Regra de fluxo: retirada só faz sentido enquanto a cautela está nos estados
  // iniciais; devolução só após a retirada.
  if (type === ChecklistType.RETIRADA) {
    if (
      caution.status !== CautionStatus.AGUARDANDO_RETIRADA &&
      caution.status !== CautionStatus.RETIRADA_EM_ANDAMENTO &&
      caution.status !== CautionStatus.EM_USO
    ) {
      throw Errors.conflict("Checklist de retirada não está disponível para esta cautela.");
    }
  } else {
    if (
      caution.status !== CautionStatus.EM_USO &&
      caution.status !== CautionStatus.AGUARDANDO_DEVOLUCAO &&
      caution.status !== CautionStatus.DEVOLUCAO_EM_ANALISE &&
      caution.status !== CautionStatus.FINALIZADA &&
      caution.status !== CautionStatus.FINALIZADA_COM_OBSERVACAO
    ) {
      throw Errors.conflict(
        "Checklist de devolução só fica disponível após o veículo estar em uso.",
      );
    }
  }
  // Inicializa marcando como RETIRADA_EM_ANDAMENTO quando primeira abertura
  // pelo usuário do checklist de retirada.
  const checklist = await initializeChecklist(caution, type, actor, context);

  if (
    type === ChecklistType.RETIRADA &&
    caution.status === CautionStatus.AGUARDANDO_RETIRADA &&
    checklist.status === ChecklistStatus.PENDENTE &&
    !isAdmin(actor.user.role)
  ) {
    await prisma.caution.update({
      where: { id: caution.id },
      data: { status: CautionStatus.RETIRADA_EM_ANDAMENTO },
    });
    await prisma.checklist.update({
      where: { id: checklist.id },
      data: { status: ChecklistStatus.EM_PREENCHIMENTO },
    });
    checklist.status = ChecklistStatus.EM_PREENCHIMENTO;
  }

  return checklist;
}

export async function getChecklistById(
  id: string,
  actor: SessionUser,
): Promise<ChecklistWithItems> {
  const checklist = await prisma.checklist.findUnique({
    where: { id },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  ensureFound(checklist);
  ensureCanRead(checklist as Checklist, actor);
  return checklist as ChecklistWithItems;
}

// ----------------------------------------------------------------------------
// Atualização de rascunho
// ----------------------------------------------------------------------------

export async function saveChecklistDraft(
  id: string,
  input: SaveChecklistDraftInput,
  actor: SessionUser,
): Promise<ChecklistWithItems> {
  const current = await prisma.checklist.findUnique({
    where: { id },
    include: { items: true },
  });
  ensureFound(current);
  ensureCanWrite(current as Checklist, actor);

  await prisma.$transaction(async (tx) => {
    await tx.checklist.update({
      where: { id },
      data: {
        status: ChecklistStatus.EM_PREENCHIMENTO,
        realDate: input.realDate ? parseIsoDate(input.realDate) : undefined,
        realTime: input.realTime,
        mileage: input.mileage,
        fuelLevel: input.fuelLevel,
        fuelCardStatus: input.fuelCardStatus,
        internalCleanliness: input.internalCleanliness,
        externalCleanliness: input.externalCleanliness,
        parkingLocation: input.parkingLocation ?? undefined,
        hasChangesFromInitial: input.hasChangesFromInitial,
        changesDescription: input.changesDescription ?? undefined,
        hasDamage: input.hasDamage,
        damageDescription: input.damageDescription ?? undefined,
        generalNotes: input.generalNotes ?? undefined,
      },
    });

    if (input.items && input.items.length > 0) {
      for (const it of input.items) {
        await tx.checklistItem.updateMany({
          where: { checklistId: id, itemKey: it.itemKey },
          data: { answer: it.answer, observation: it.observation ?? null },
        });
      }
    }
  });

  return getChecklistById(id, actor);
}

// ----------------------------------------------------------------------------
// Envio (submit) — transição atômica de Caution e Vehicle
// ----------------------------------------------------------------------------

export async function submitChecklist(
  id: string,
  input: SubmitChecklistInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<ChecklistWithItems> {
  const current = await prisma.checklist.findUnique({
    where: { id },
    include: { items: true, caution: { include: { vehicle: true } } },
  });
  ensureFound(current);
  ensureCanWrite(current as Checklist, actor);

  // Garante que todos os items foram respondidos (cobertura).
  const itemKeySet = new Set(current!.items.map((i) => i.itemKey));
  const answeredSet = new Set(input.items.map((i) => i.itemKey));
  const missing = [...itemKeySet].filter((k) => !answeredSet.has(k));
  if (missing.length > 0) {
    throw Errors.validation("Há itens sem resposta no checklist.", {
      items: missing.map((k) => `Item "${k}" sem resposta.`),
    });
  }

  // Foto obrigatória para itens RUIM/AUSENTE e para avaria (seção 20 / aceite
  // #14). As fotos são enviadas antes do submit; aqui validamos a cobertura.
  const photos = await prisma.checklistPhoto.findMany({
    where: { checklistId: id },
    select: { checklistItemId: true, type: true },
  });
  const itemIdsWithPhoto = new Set(
    photos.map((p) => p.checklistItemId).filter((v): v is string => v !== null),
  );
  const itemByKey = new Map(current!.items.map((i) => [i.itemKey, i]));
  const missingItemPhotos: string[] = [];
  for (const ans of input.items) {
    if (ans.answer === "RUIM" || ans.answer === "AUSENTE") {
      const item = itemByKey.get(ans.itemKey);
      if (item && !itemIdsWithPhoto.has(item.id)) {
        missingItemPhotos.push(item.itemLabel || ans.itemKey);
      }
    }
  }
  if (missingItemPhotos.length > 0) {
    throw Errors.validation("Itens RUIM/AUSENTE exigem foto.", {
      items: missingItemPhotos.map((l) => `Anexe a foto do item "${l}".`),
    });
  }
  if (input.hasDamage && !photos.some((p) => p.type === "AVARIA")) {
    throw Errors.validation("Avaria exige foto.", {
      damage: ["Anexe ao menos uma foto da avaria."],
    });
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Atualiza o checklist (campos + status ENVIADO + submittedAt + confirm).
    const checklist = await tx.checklist.update({
      where: { id },
      data: {
        status: ChecklistStatus.ENVIADO,
        realDate: parseIsoDate(input.realDate),
        realTime: input.realTime,
        mileage: input.mileage,
        fuelLevel: input.fuelLevel,
        fuelCardStatus: input.fuelCardStatus,
        internalCleanliness: input.internalCleanliness,
        externalCleanliness: input.externalCleanliness,
        parkingLocation: input.parkingLocation ?? null,
        hasChangesFromInitial: input.hasChangesFromInitial,
        changesDescription: input.changesDescription ?? null,
        hasDamage: input.hasDamage,
        damageDescription: input.damageDescription ?? null,
        generalNotes: input.generalNotes ?? null,
        confirmedAt: now,
        confirmedByUserId: actor.user.id,
        confirmationIp: context?.ipAddress ?? null,
        confirmationUa: context?.userAgent ?? null,
        submittedAt: now,
      },
      include: { items: true },
    });

    // Atualiza cada item.
    for (const it of input.items) {
      await tx.checklistItem.updateMany({
        where: { checklistId: id, itemKey: it.itemKey },
        data: { answer: it.answer, observation: it.observation ?? null },
      });
    }

    // Transições de status — só ocorrem em RETIRADA→EM_USO e DEVOLUCAO→EM_ANALISE.
    const caution = (current as Checklist & { caution: Caution & { vehicle: Vehicle } }).caution;
    if (current!.type === ChecklistType.RETIRADA) {
      // Aceita estados AGUARDANDO_RETIRADA ou RETIRADA_EM_ANDAMENTO.
      if (
        caution.status === CautionStatus.AGUARDANDO_RETIRADA ||
        caution.status === CautionStatus.RETIRADA_EM_ANDAMENTO
      ) {
        await tx.caution.update({
          where: { id: caution.id },
          data: {
            status: CautionStatus.EM_USO,
            actualWithdrawalAt: now,
          },
        });
        await tx.vehicle.update({
          where: { id: caution.vehicleId },
          data: {
            currentStatus: VehicleStatus.EM_USO,
            currentMileage: input.mileage,
          },
        });
      }
    } else {
      // DEVOLUCAO
      if (
        caution.status === CautionStatus.EM_USO ||
        caution.status === CautionStatus.AGUARDANDO_DEVOLUCAO
      ) {
        await tx.caution.update({
          where: { id: caution.id },
          data: {
            status: CautionStatus.DEVOLUCAO_EM_ANALISE,
            actualReturnAt: now,
          },
        });
        await tx.vehicle.update({
          where: { id: caution.vehicleId },
          data: {
            currentStatus: VehicleStatus.AGUARDANDO_DEVOLUCAO,
            currentMileage: input.mileage,
          },
        });
      }
    }

    return checklist;
  });

  await recordAudit({
    action: "CHECKLIST_SUBMITTED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "Checklist",
    entityId: id,
    metadata: {
      type: current!.type,
      cautionId: current!.cautionId,
      mileage: input.mileage,
      fuelLevel: input.fuelLevel,
      hasDamage: input.hasDamage ?? false,
    },
    context,
  });

  return getChecklistById(result.id, actor);
}

// ----------------------------------------------------------------------------
// Revisão pelo admin
// ----------------------------------------------------------------------------

export async function reviewChecklist(
  id: string,
  input: ReviewChecklistInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<ChecklistWithItems> {
  const current = await prisma.checklist.findUnique({
    where: { id },
    include: { caution: { include: { vehicle: true } } },
  });
  ensureFound(current);
  if (current!.status !== ChecklistStatus.ENVIADO) {
    throw Errors.conflict("Apenas checklists com status ENVIADO podem ser revisados.");
  }

  const newStatus =
    input.decision === "APPROVE" ? ChecklistStatus.APROVADO : ChecklistStatus.RETIFICADO;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.checklist.update({
      where: { id },
      data: {
        status: newStatus,
        generalNotes:
          input.reviewNotes && current!.generalNotes
            ? `${current!.generalNotes}\n\n[Revisão] ${input.reviewNotes}`
            : (input.reviewNotes ?? current!.generalNotes),
        reviewedAt: now,
        reviewedByAdminId: actor.user.id,
      },
    });

    // Transições de cautela/veículo somente na aprovação do checklist de DEVOLUCAO.
    const caution = (current as Checklist & { caution: Caution & { vehicle: Vehicle } }).caution;
    if (
      current!.type === ChecklistType.DEVOLUCAO &&
      newStatus === ChecklistStatus.APROVADO &&
      caution.status === CautionStatus.DEVOLUCAO_EM_ANALISE
    ) {
      await tx.caution.update({
        where: { id: caution.id },
        data: { status: CautionStatus.FINALIZADA },
      });
      await tx.vehicle.update({
        where: { id: caution.vehicleId },
        data: { currentStatus: VehicleStatus.DISPONIVEL },
      });
    }
  });

  await recordAudit({
    action: input.decision === "APPROVE" ? "CHECKLIST_REVIEWED" : "CHECKLIST_RECTIFIED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "Checklist",
    entityId: id,
    metadata: {
      decision: input.decision,
      type: current!.type,
      cautionId: current!.cautionId,
    },
    context,
  });

  // Notifica o dono do checklist sobre a decisão (best effort).
  const typeLabel = CHECKLIST_TYPE_LABEL[current!.type];
  if (input.decision === "APPROVE") {
    await createNotification({
      userId: current!.userId,
      type: "GENERAL",
      title: "Checklist aprovado",
      message: `Seu checklist de ${typeLabel} foi aprovado.`,
      relatedEntityType: "Caution",
      relatedEntityId: current!.cautionId,
    });
  } else {
    await createNotification({
      userId: current!.userId,
      type: "CHECKLIST_PENDING",
      title: "Ajuste solicitado no checklist",
      message: `Seu checklist de ${typeLabel} precisa de ajustes.${
        input.reviewNotes ? ` ${input.reviewNotes}` : ""
      }`,
      relatedEntityType: "Caution",
      relatedEntityId: current!.cautionId,
    });
  }

  return getChecklistById(id, actor);
}

export type { ChecklistWithItems };
