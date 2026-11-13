import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireSuperAdmin } from "@/server/modules/auth/guards";
import { changeUserRoleSchema } from "@/server/modules/users/user.schemas";
import { changeUserRole } from "@/server/modules/users/user.service";
import { toPublicUser } from "@/server/modules/users/user.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireSuperAdmin(context);
  const { id } = await params;
  const input = await parseJsonBody(req, changeUserRoleSchema);
  const updated = await changeUserRole(id, input, actor, context);
  return jsonOk({ user: toPublicUser(updated) });
});
