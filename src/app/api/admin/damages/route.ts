import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import {
  createDamageSchema,
  listDamagesQuerySchema,
} from "@/server/modules/damages/damage.schemas";
import { createDamage, listDamages } from "@/server/modules/damages/damage.service";
import { toPublicDamage } from "@/server/modules/damages/damage.dto";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const input = await parseJsonBody(req, createDamageSchema);
  const damage = await createDamage(input, actor, context);
  return jsonOk({ damage: toPublicDamage(damage) }, 201);
});

export const GET = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  await requireAdmin(context);

  const url = new URL(req.url);
  const query = listDamagesQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listDamages(query);
  return jsonOk({
    items: result.items.map((d) => toPublicDamage(d, { includeVehicle: true })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
});
