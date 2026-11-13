import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { approveRequestSchema } from "@/server/modules/requests/request.schemas";
import { approveRequest } from "@/server/modules/requests/request.service";
import { toPublicRequest } from "@/server/modules/requests/request.dto";
import { toPublicVehicle } from "@/server/modules/vehicles/vehicle.dto";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const { id } = await params;
  const input = await parseJsonBody(req, approveRequestSchema);
  const { request, caution, vehicle } = await approveRequest(id, input, actor, context);
  return jsonOk({
    request: toPublicRequest(request),
    caution: {
      id: caution.id,
      publicCode: caution.publicCode,
      status: caution.status,
    },
    vehicle: toPublicVehicle(vehicle),
  });
});
