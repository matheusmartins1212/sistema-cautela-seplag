import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import {
  createVehicleSchema,
  listVehiclesQuerySchema,
} from "@/server/modules/vehicles/vehicle.schemas";
import { createVehicle, listVehicles } from "@/server/modules/vehicles/vehicle.service";
import { toPublicVehicle } from "@/server/modules/vehicles/vehicle.dto";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const input = await parseJsonBody(req, createVehicleSchema);
  const vehicle = await createVehicle(input, actor, context);
  return jsonOk({ vehicle: toPublicVehicle(vehicle, { includeNotes: true }) }, 201);
});

export const GET = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  await requireAdmin(context);

  const url = new URL(req.url);
  const query = listVehiclesQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listVehicles(query);
  return jsonOk({
    items: result.items.map((v) => toPublicVehicle(v, { includeNotes: true })),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
});
