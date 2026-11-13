import { handleRoute, jsonOk } from "@/server/lib/http";
import { requireUser } from "@/server/modules/auth/guards";
import { markAllNotificationsRead } from "@/server/modules/notifications/notifications.service";

export const runtime = "nodejs";

export const POST = handleRoute(async () => {
  const actor = await requireUser();
  const count = await markAllNotificationsRead(actor.user.id);
  return jsonOk({ count });
});
