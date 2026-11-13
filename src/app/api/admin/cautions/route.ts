import { handleRoute, jsonOk } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { listAdminCautionsQuerySchema } from "@/server/modules/cautions/caution.schemas";
import { listAllCautions } from "@/server/modules/cautions/caution.service";
import { toPublicCaution } from "@/server/modules/cautions/caution.dto";

export const runtime = "nodejs";

export const GET = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  await requireAdmin(context);

  const url = new URL(req.url);
  const query = listAdminCautionsQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listAllCautions(query);
  return jsonOk({
    items: result.items.map((c) =>
      toPublicCaution(c, {
        includeRequest: true,
        includeUser: true,
        includeVehicle: true,
      }),
    ),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
});
