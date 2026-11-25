import { NextResponse } from "next/server";
import { handleRoute } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireAdmin } from "@/server/modules/auth/guards";
import { setTemporaryPassword } from "@/server/modules/users/user.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Gera a senha provisória. A resposta traz a senha uma única vez e não é guardada em cache. */
export const POST = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireAdmin(context);
  const { id } = await params;
  const { temporaryPassword } = await setTemporaryPassword(id, actor, context);
  return NextResponse.json(
    { ok: true, data: { temporaryPassword } },
    { headers: { "Cache-Control": "no-store" } },
  );
});
