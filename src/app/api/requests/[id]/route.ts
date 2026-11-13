import { handleRoute, jsonOk } from "@/server/lib/http";
import { requireUser } from "@/server/modules/auth/guards";
import { getRequestById } from "@/server/modules/requests/request.service";
import { toPublicRequest } from "@/server/modules/requests/request.dto";
import { isAdmin } from "@/server/modules/auth/rbac";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = handleRoute<RouteContext>(async (_req, { params }) => {
  const actor = await requireUser();
  const { id } = await params;
  const request = await getRequestById(id, actor);
  return jsonOk({
    request: toPublicRequest(request, {
      includeUser: isAdmin(actor.user.role),
      includeCaution: true,
    }),
  });
});
