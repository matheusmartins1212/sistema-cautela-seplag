import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { updateAgencySchema } from "@/server/modules/agencies/agency.schemas";
import { deleteAgency, updateAgency } from "@/server/modules/agencies/agency.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const { id } = await params;
  const input = await parseJsonBody(req, updateAgencySchema);
  const agency = await updateAgency(id, input, actor, context);
  return jsonOk({ agency });
});

export const DELETE = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const { id } = await params;
  await deleteAgency(id, actor, context);
  return jsonOk({ deleted: true });
});
