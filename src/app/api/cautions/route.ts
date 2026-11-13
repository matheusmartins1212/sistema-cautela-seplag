import { handleRoute, jsonOk } from "@/server/lib/http";
import { requireUser } from "@/server/modules/auth/guards";
import { listMyCautionsQuerySchema } from "@/server/modules/cautions/caution.schemas";
import { listMyCautions } from "@/server/modules/cautions/caution.service";
import { toPublicCaution } from "@/server/modules/cautions/caution.dto";

export const runtime = "nodejs";

export const GET = handleRoute(async (req) => {
  const actor = await requireUser();
  const url = new URL(req.url);
  const query = listMyCautionsQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listMyCautions(query, actor);
  return jsonOk({
    items: result.items.map((c) =>
      toPublicCaution(c, { includeRequest: true, includeVehicle: true }),
    ),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
});
