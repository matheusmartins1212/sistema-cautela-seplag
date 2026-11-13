import { handleRoute, jsonOk } from "@/server/lib/http";
import { requireAdmin } from "@/server/modules/auth/guards";
import { getUserByIdAdmin } from "@/server/modules/users/user.service";
import { toPublicUser } from "@/server/modules/users/user.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = handleRoute<RouteContext>(async (_req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const user = await getUserByIdAdmin(id);
  return jsonOk({ user: toPublicUser(user) });
});
