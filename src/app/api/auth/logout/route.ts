import { handleRoute, jsonOk } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { logout } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  await logout(context);
  return jsonOk({ message: "Sessão encerrada." });
});
