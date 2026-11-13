import { handleRoute, jsonOk } from "@/server/lib/http";
import { requireUser } from "@/server/modules/auth/guards";
import { getCautionById } from "@/server/modules/cautions/caution.service";
import { toPublicCaution } from "@/server/modules/cautions/caution.dto";
import { isAdmin } from "@/server/modules/auth/rbac";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = handleRoute<RouteContext>(async (_req, { params }) => {
  const actor = await requireUser();
  const { id } = await params;
  const caution = await getCautionById(id, actor);
  return jsonOk({
    caution: toPublicCaution(caution, {
      includeRequest: true,
      includeVehicle: true,
      includeUser: isAdmin(actor.user.role),
    }),
  });
});
