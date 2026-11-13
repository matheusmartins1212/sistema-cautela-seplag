import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { cancelCautionSchema } from "@/server/modules/cautions/caution.schemas";
import { cancelCautionByAdmin } from "@/server/modules/cautions/caution.service";
import { toPublicCaution } from "@/server/modules/cautions/caution.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const { id } = await params;
  const input = await parseJsonBody(req, cancelCautionSchema);
  const updated = await cancelCautionByAdmin(id, input, actor, context);
  return jsonOk({ caution: toPublicCaution(updated) });
});
