import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { updateDamageSchema } from "@/server/modules/damages/damage.schemas";
import { getDamageById, updateDamage } from "@/server/modules/damages/damage.service";
import { toPublicDamage } from "@/server/modules/damages/damage.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  await requireAdmin(context);
  const { id } = await params;
  const damage = await getDamageById(id);
  return jsonOk({ damage: toPublicDamage(damage, { includeVehicle: true }) });
});

export const PATCH = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const { id } = await params;
  const input = await parseJsonBody(req, updateDamageSchema);
  const damage = await updateDamage(id, input, actor, context);
  return jsonOk({ damage: toPublicDamage(damage) });
});
