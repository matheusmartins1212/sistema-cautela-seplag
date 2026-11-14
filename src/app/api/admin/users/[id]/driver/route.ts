import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { updateDriverProfileSchema } from "@/server/modules/users/user.schemas";
import { updateDriverProfile } from "@/server/modules/users/user.service";
import { toPublicUser } from "@/server/modules/users/user.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Habilita/desabilita o usuário como condutor da central (dados da CNH). */
export const POST = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const { id } = await params;
  const input = await parseJsonBody(req, updateDriverProfileSchema);
  const updated = await updateDriverProfile(id, input, actor, context);
  return jsonOk({ user: toPublicUser(updated) });
});
