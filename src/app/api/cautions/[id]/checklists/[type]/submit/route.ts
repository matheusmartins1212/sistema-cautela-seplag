import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireUser } from "@/server/modules/auth/guards";
import {
  checklistTypeParamSchema,
  submitChecklistSchema,
} from "@/server/modules/checklists/checklist.schemas";
import {
  getOrInitChecklistForCaution,
  submitChecklist,
} from "@/server/modules/checklists/checklist.service";
import { toPublicChecklist } from "@/server/modules/checklists/checklist.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; type: string }> };

export const POST = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireUser();
  const { id, type: typeRaw } = await params;
  const type = checklistTypeParamSchema.parse(typeRaw);
  const input = await parseJsonBody(req, submitChecklistSchema);
  const checklist = await getOrInitChecklistForCaution(id, type, actor, context);
  const submitted = await submitChecklist(checklist.id, input, actor, context);
  return jsonOk({ checklist: toPublicChecklist(submitted) });
});
