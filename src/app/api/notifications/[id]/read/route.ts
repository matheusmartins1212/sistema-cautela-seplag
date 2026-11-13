import { handleRoute, jsonOk } from "@/server/lib/http";
import { requireUser } from "@/server/modules/auth/guards";
import { markNotificationRead } from "@/server/modules/notifications/notifications.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = handleRoute<RouteContext>(async (_req, { params }) => {
  const actor = await requireUser();
  const { id } = await params;
  await markNotificationRead(id, actor.user.id);
  return jsonOk({ ok: true });
});
