import { handleRoute, jsonOk } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { env } from "@/server/config/env";
import { Errors } from "@/server/lib/errors";
import { requireUser } from "@/server/modules/auth/guards";
import {
  listPhotosByChecklist,
  uploadPhoto,
} from "@/server/modules/checklists/checklist-photo.service";
import { PhotoType } from "@prisma/client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_PHOTO_TYPES = new Set<string>(Object.values(PhotoType));

// Teto do CORPO da requisição: o arquivo (<= UPLOAD_MAX_BYTES) mais uma folga
// para os limites/campos do multipart. Barra uploads gigantes ANTES de
// bufferizar o corpo na memória (mitiga DoS de memória).
const MAX_UPLOAD_REQUEST_BYTES = env.UPLOAD_MAX_BYTES + 1024 * 1024;

export const GET = handleRoute<RouteContext>(async (_req, { params }) => {
  const actor = await requireUser();
  const { id } = await params;
  const photos = await listPhotosByChecklist(id, actor);
  return jsonOk({
    items: photos.map((p) => ({
      id: p.id,
      type: p.type,
      checklistItemId: p.checklistItemId,
      mimeType: p.mimeType,
      size: p.size,
      originalName: p.originalName,
      url: `/api/photos/${p.id}`,
      createdAt: p.createdAt.toISOString(),
    })),
  });
});

export const POST = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireUser();
  const { id } = await params;

  // Guarda antecipada: rejeita corpos acima do teto SEM lê-los na memória.
  // Content-Length pode estar ausente (chunked); nesse caso o limite efetivo
  // por arquivo ainda é aplicado em uploadPhoto após o parse.
  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_REQUEST_BYTES) {
    const mb = Math.round(env.UPLOAD_MAX_BYTES / (1024 * 1024));
    throw Errors.validation(`Arquivo excede o limite de ${mb} MB.`);
  }

  const form = await req.formData();
  const file = form.get("file");
  const typeRaw = form.get("type");
  const itemKey = form.get("itemKey");

  if (!(file instanceof Blob)) {
    throw Errors.validation("Arquivo (campo 'file') é obrigatório.");
  }
  if (typeof typeRaw !== "string" || !VALID_PHOTO_TYPES.has(typeRaw)) {
    throw Errors.validation("Tipo de foto inválido.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const photo = await uploadPhoto(
    id,
    {
      buffer,
      mimeType: file.type || "application/octet-stream",
      originalName: file instanceof File && file.name ? file.name : "upload.jpg",
      type: typeRaw as PhotoType,
      checklistItemKey: typeof itemKey === "string" && itemKey.length > 0 ? itemKey : undefined,
    },
    actor,
    context,
  );

  return jsonOk(
    {
      photo: {
        id: photo.id,
        type: photo.type,
        checklistItemId: photo.checklistItemId,
        mimeType: photo.mimeType,
        size: photo.size,
        url: `/api/photos/${photo.id}`,
        createdAt: photo.createdAt.toISOString(),
      },
    },
    201,
  );
});
