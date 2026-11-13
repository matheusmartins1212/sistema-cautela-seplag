import { handleRoute, jsonOk } from "@/server/lib/http";
import { Errors } from "@/server/lib/errors";
import { getCurrentSession } from "@/server/modules/auth/session";
import { toPublicUser } from "@/server/modules/users/user.dto";

export const runtime = "nodejs";

export const GET = handleRoute(async () => {
  const session = await getCurrentSession();
  if (!session) {
    throw Errors.unauthorized();
  }
  return jsonOk({ user: toPublicUser(session.user) });
});
