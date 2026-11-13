import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireUser } from "@/server/modules/auth/guards";
import {
  checklistTypeParamSchema,
  saveChecklistDraftSchema,
} from "@/server/modules/checklists/checklist.schemas";
import {
  getOrInitChecklistForCaution,
  saveChecklistDraft,
} from "@/server/modules/checklists/checklist.service";
import { toPublicChecklist } from "@/server/modules/checklists/checklist.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; type: string }> };

export const GET = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireUser();
  const { id, type: typeRaw } = await params;
  const type = checklistTypeParamSchema.parse(typeRaw);
  const checklist = await getOrInitChecklistForCaution(id, type, actor, context);
  return jsonOk({ checklist: toPublicChecklist(checklist) });
});

export const PUT = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireUser();
  const { id, type: typeRaw } = await params;
  const type = checklistTypeParamSchema.parse(typeRaw);
  const input = await parseJsonBody(req, saveChecklistDraftSchema);
  const checklist = await getOrInitChecklistForCaution(id, type, actor, context);
  const updated = await saveChecklistDraft(checklist.id, input, actor);
  return jsonOk({ checklist: toPublicChecklist(updated) });
});
