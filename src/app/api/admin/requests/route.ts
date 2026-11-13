import { handleRoute, jsonOk } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { listAdminRequestsQuerySchema } from "@/server/modules/requests/request.schemas";
import { listAllRequests } from "@/server/modules/requests/request.service";
import { toPublicRequest } from "@/server/modules/requests/request.dto";

export const runtime = "nodejs";

export const GET = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  await requireAdmin(context);

  const url = new URL(req.url);
  const query = listAdminRequestsQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listAllRequests(query);
  return jsonOk({
    items: result.items.map((r) => toPublicRequest(r, { includeUser: true, includeCaution: true })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
});
