import {
  ChecklistStatus,
  PhotoType,
  type Checklist,
  type ChecklistItem,
  type ChecklistPhoto,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { env } from "@/server/config/env";
import { Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import { isAdmin } from "@/server/modules/auth/rbac";
import type { SessionUser } from "@/server/modules/auth/session";
import { getStorage } from "@/server/modules/storage/local.provider";

/**
 * Service de fotos de checklist. Aplica as regras de seções 5.4, 18 e 25:
 *  - upload restrito ao dono enquanto o checklist permite edição;
 *  - admin pode ler e remover sempre;
 *  - MIME e tamanho validados no servidor;
 *  - nome original NUNCA usado em disco; fileKey opaca.
 */

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Confere a assinatura do arquivo: o tipo informado pelo navegador pode ser
 * qualquer coisa, os primeiros bytes não.
 */
export function detectImageMime(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function assertImage(mimeType: string, buffer: Buffer): void {
  const declared = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  if (!ALLOWED_MIME.has(declared)) {
    throw Errors.validation("Formato de imagem inválido. Use JPG, PNG ou WebP.");
  }
  if (buffer.byteLength <= 0) {
    throw Errors.validation("Arquivo vazio.");
  }
  if (buffer.byteLength > env.UPLOAD_MAX_BYTES) {
    const mb = Math.round(env.UPLOAD_MAX_BYTES / (1024 * 1024));
    throw Errors.validation(`Arquivo excede o limite de ${mb} MB.`);
  }
  if (detectImageMime(buffer) !== declared) {
    throw Errors.validation("O arquivo não é uma imagem válida. Use JPG, PNG ou WebP.");
  }
}

function ensureChecklistWritable(c: Checklist): void {
  if (
    c.status !== ChecklistStatus.PENDENTE &&
    c.status !== ChecklistStatus.EM_PREENCHIMENTO &&
    c.status !== ChecklistStatus.RETIFICADO
  ) {
    throw Errors.conflict("Checklist já enviado — fotos não podem ser alteradas.");
  }
}

async function loadChecklistOwnedByActor(
  checklistId: string,
  actor: SessionUser,
): Promise<Checklist & { items: ChecklistItem[] }> {
  const c = await prisma.checklist.findUnique({
    where: { id: checklistId },
    include: { items: true },
  });
  if (!c) throw Errors.notFound("Checklist não encontrado.");
  if (c.userId !== actor.user.id && !isAdmin(actor.user.role)) {
    throw Errors.notFound("Checklist não encontrado.");
  }
  return c;
}

// ----------------------------------------------------------------------------
// Upload
// ----------------------------------------------------------------------------

export interface UploadPhotoInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  type: PhotoType;
  checklistItemKey?: string; // se vinculada a um item
}

/** Posições com uma única foto por checklist. */
export const SINGLE_PHOTO_TYPES: ReadonlySet<PhotoType> = new Set<PhotoType>([
  PhotoType.DIANTEIRA,
  PhotoType.TRASEIRA,
  PhotoType.LATERAL_ESQUERDA,
  PhotoType.LATERAL_DIREITA,
  PhotoType.PAINEL,
  PhotoType.LOCAL_ESTACIONADO,
]);

export async function uploadPhoto(
  checklistId: string,
  input: UploadPhotoInput,
  actor: SessionUser,
  context?: RequestContext,
): Promise<ChecklistPhoto> {
  assertImage(input.mimeType, input.buffer);

  const checklist = await loadChecklistOwnedByActor(checklistId, actor);
  // Admin pode subir mesmo após envio? Por segurança/integridade, NÃO.
  // Permitimos apenas durante a edição do dono.
  if (checklist.userId !== actor.user.id) {
    throw Errors.forbidden("Apenas o condutor responsável pode enviar fotos para este checklist.");
  }
  ensureChecklistWritable(checklist);

  let checklistItemId: string | null = null;
  if (input.checklistItemKey) {
    const item = checklist.items.find((i) => i.itemKey === input.checklistItemKey);
    if (!item) {
      throw Errors.validation("Item de checklist não encontrado.");
    }
    checklistItemId = item.id;
  }

  // Fotos de posição do veículo: uma de cada no checklist. Para trocar,
  // remove-se a atual. Avaria e itens continuam aceitando várias.
  if (!checklistItemId && SINGLE_PHOTO_TYPES.has(input.type)) {
    const existing = await prisma.checklistPhoto.count({
      where: { checklistId, checklistItemId: null, type: input.type },
    });
    if (existing > 0) {
      throw Errors.conflict("Já existe uma foto nesta posição. Remova a atual para enviar outra.");
    }
  }

  const stored = await getStorage().put({
    buffer: input.buffer,
    // Grava o tipo conferido nos bytes, não o informado pelo navegador.
    mimeType: detectImageMime(input.buffer) ?? input.mimeType,
    originalName: input.originalName,
  });

  const photo = await prisma.checklistPhoto.create({
    data: {
      checklistId,
      checklistItemId,
      type: input.type,
      fileKey: stored.fileKey,
      originalName: input.originalName.slice(0, 200),
      mimeType: stored.mimeType,
      size: stored.size,
      uploadedByUserId: actor.user.id,
    },
  });

  await recordAudit({
    action: "PHOTO_UPLOADED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "Checklist",
    entityId: checklistId,
    metadata: {
      photoId: photo.id,
      type: photo.type,
      size: photo.size,
      itemKey: input.checklistItemKey ?? null,
    },
    context,
  });

  return photo;
}

// ----------------------------------------------------------------------------
// Listagem
// ----------------------------------------------------------------------------

export async function listPhotosByChecklist(
  checklistId: string,
  actor: SessionUser,
): Promise<ChecklistPhoto[]> {
  await loadChecklistOwnedByActor(checklistId, actor);
  return prisma.checklistPhoto.findMany({
    where: { checklistId },
    orderBy: { createdAt: "asc" },
  });
}

// ----------------------------------------------------------------------------
// Servir (stream) — autorização obrigatória
// ----------------------------------------------------------------------------

export async function loadPhotoForActor(
  photoId: string,
  actor: SessionUser,
): Promise<{
  meta: ChecklistPhoto;
  stream: NodeJS.ReadableStream;
}> {
  const photo = await prisma.checklistPhoto.findUnique({
    where: { id: photoId },
    include: { checklist: true },
  });
  if (!photo) throw Errors.notFound("Foto não encontrada.");
  if (photo.checklist.userId !== actor.user.id && !isAdmin(actor.user.role)) {
    throw Errors.notFound("Foto não encontrada.");
  }
  const { stream } = await getStorage().get(photo.fileKey);
  return { meta: photo, stream };
}

// ----------------------------------------------------------------------------
// Remoção (admin sempre; usuário se ainda em edição)
// ----------------------------------------------------------------------------

export async function deletePhoto(
  photoId: string,
  actor: SessionUser,
  context?: RequestContext,
): Promise<void> {
  const photo = await prisma.checklistPhoto.findUnique({
    where: { id: photoId },
    include: { checklist: true },
  });
  if (!photo) throw Errors.notFound("Foto não encontrada.");

  if (!isAdmin(actor.user.role)) {
    if (photo.checklist.userId !== actor.user.id) {
      throw Errors.notFound("Foto não encontrada.");
    }
    ensureChecklistWritable(photo.checklist);
  }

  await prisma.checklistPhoto.delete({ where: { id: photoId } });
  await getStorage().remove(photo.fileKey);

  await recordAudit({
    action: "PHOTO_UPLOADED",
    actorUserId: actor.user.id,
    actorRole: actor.user.role,
    entityType: "Checklist",
    entityId: photo.checklistId,
    metadata: {
      photoId: photo.id,
      event: "deleted",
    },
    context,
  });
}
