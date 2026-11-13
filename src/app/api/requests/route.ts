import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireUser } from "@/server/modules/auth/guards";
import {
  createRequestSchema,
  listMyRequestsQuerySchema,
} from "@/server/modules/requests/request.schemas";
import { createRequest, listMyRequests } from "@/server/modules/requests/request.service";
import { toPublicRequest } from "@/server/modules/requests/request.dto";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  const actor = await requireUser();
  const input = await parseJsonBody(req, createRequestSchema);
  const created = await createRequest(input, actor, context);
  return jsonOk({ request: toPublicRequest(created) }, 201);
});

export const GET = handleRoute(async (req) => {
  const actor = await requireUser();
  const url = new URL(req.url);
  const query = listMyRequestsQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listMyRequests(query, actor);
  return jsonOk({
    items: result.items.map((r) => toPublicRequest(r, { includeCaution: true })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
});
