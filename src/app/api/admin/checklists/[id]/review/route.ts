import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { reviewChecklistSchema } from "@/server/modules/checklists/checklist.schemas";
import { reviewChecklist } from "@/server/modules/checklists/checklist.service";
import { toPublicChecklist } from "@/server/modules/checklists/checklist.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const { id } = await params;
  const input = await parseJsonBody(req, reviewChecklistSchema);
  const updated = await reviewChecklist(id, input, actor, context);
  return jsonOk({ checklist: toPublicChecklist(updated) });
});
