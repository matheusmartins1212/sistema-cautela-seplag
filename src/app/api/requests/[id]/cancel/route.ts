import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireUser } from "@/server/modules/auth/guards";
import { cancelRequestSchema } from "@/server/modules/requests/request.schemas";
import { cancelMyRequest } from "@/server/modules/requests/request.service";
import { toPublicRequest } from "@/server/modules/requests/request.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireUser();
  const { id } = await params;
  const input = await parseJsonBody(req, cancelRequestSchema);
  const updated = await cancelMyRequest(id, input, actor, context);
  return jsonOk({ request: toPublicRequest(updated) });
});
