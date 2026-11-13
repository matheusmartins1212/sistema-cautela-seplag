import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { changeStatusSchema } from "@/server/modules/vehicles/vehicle.schemas";
import { changeVehicleStatus } from "@/server/modules/vehicles/vehicle.service";
import { toPublicVehicle } from "@/server/modules/vehicles/vehicle.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const { id } = await params;
  const input = await parseJsonBody(req, changeStatusSchema);
  const vehicle = await changeVehicleStatus(id, input, actor, context);
  return jsonOk({ vehicle: toPublicVehicle(vehicle, { includeNotes: true }) });
});
