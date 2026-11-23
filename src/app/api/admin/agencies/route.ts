import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { createAgencySchema } from "@/server/modules/agencies/agency.schemas";
import { createAgency, listAllAgencies } from "@/server/modules/agencies/agency.service";

export const runtime = "nodejs";

export const GET = handleRoute(async (req) => {
  await requireAdmin(getRequestContext(req.headers));
  const agencies = await listAllAgencies();
  return jsonOk({ agencies });
});

export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const input = await parseJsonBody(req, createAgencySchema);
  const agency = await createAgency(input, actor, context);
  return jsonOk({ agency }, 201);
});
