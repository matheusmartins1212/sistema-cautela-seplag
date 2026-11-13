import { handleRoute, jsonOk } from "@/server/lib/http";
import { requireAdmin } from "@/server/modules/auth/guards";
import { listUsersQuerySchema } from "@/server/modules/users/user.schemas";
import { listUsers } from "@/server/modules/users/user.service";
import { toPublicUser } from "@/server/modules/users/user.dto";

export const runtime = "nodejs";

export const GET = handleRoute(async (req) => {
  await requireAdmin();
  const url = new URL(req.url);
  const query = listUsersQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listUsers(query);
  return jsonOk({
    items: result.items.map(toPublicUser),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
});
