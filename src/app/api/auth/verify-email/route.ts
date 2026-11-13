import { handleRoute, jsonOk, parseJsonBody, enforceRateLimit } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { verifyEmailSchema } from "@/server/modules/auth/auth.schemas";
import { verifyEmail } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  await enforceRateLimit(`verify-email:ip:${context.ipAddress ?? "unknown"}`, {
    max: 20,
  });

  const { token } = await parseJsonBody(req, verifyEmailSchema);
  await verifyEmail(token, context);

  return jsonOk({
    message: "E-mail confirmado com sucesso. Sua conta está ativa.",
  });
});
