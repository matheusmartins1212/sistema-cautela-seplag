import { handleRoute, jsonOk, parseJsonBody, enforceRateLimit } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { loginSchema } from "@/server/modules/auth/auth.schemas";
import { login } from "@/server/modules/auth/auth.service";
import { toPublicUser } from "@/server/modules/users/user.dto";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  const input = await parseJsonBody(req, loginSchema);

  // Rate limit por IP e por conta (proteção contra brute force — seção 5.1).
  await enforceRateLimit(`login:ip:${context.ipAddress ?? "unknown"}`);
  await enforceRateLimit(`login:email:${input.email}`);

  const { user } = await login(input, context);
  return jsonOk({ user: toPublicUser(user) });
});
