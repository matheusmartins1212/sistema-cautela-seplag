import { handleRoute, jsonOk } from "@/server/lib/http";
import { requireUser } from "@/server/modules/auth/guards";
import { listMyNotifications } from "@/server/modules/notifications/notifications.service";
import { listNotificationsQuerySchema } from "@/server/modules/notifications/notification.schemas";
import { toPublicNotification } from "@/server/modules/notifications/notification.dto";

export const runtime = "nodejs";

export const GET = handleRoute(async (req) => {
  const actor = await requireUser();
  const url = new URL(req.url);
  const query = listNotificationsQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listMyNotifications(actor.user.id, {
    onlyUnread: query.onlyUnread,
    limit: query.limit,
  });
  return jsonOk({
    items: result.items.map(toPublicNotification),
    total: result.total,
    unread: result.unread,
  });
});
