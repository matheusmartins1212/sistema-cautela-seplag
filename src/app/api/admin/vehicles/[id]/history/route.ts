import { handleRoute, jsonOk } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { getVehicleHistory } from "@/server/modules/vehicles/vehicle.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  await requireAdmin(context);
  const { id } = await params;
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam ?? 50) || 50, 1), 200);
  const items = await getVehicleHistory(id, limit);
  return jsonOk({ items });
});
