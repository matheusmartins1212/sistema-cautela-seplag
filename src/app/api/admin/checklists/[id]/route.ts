import { handleRoute, jsonOk } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { getChecklistById } from "@/server/modules/checklists/checklist.service";
import { toPublicChecklist } from "@/server/modules/checklists/checklist.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const { id } = await params;
  const checklist = await getChecklistById(id, actor);
  return jsonOk({ checklist: toPublicChecklist(checklist) });
});
