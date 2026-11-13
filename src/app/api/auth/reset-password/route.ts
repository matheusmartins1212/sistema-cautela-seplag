import { handleRoute, jsonOk, parseJsonBody, enforceRateLimit } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { resetPasswordSchema } from "@/server/modules/auth/auth.schemas";
import { resetPassword } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  await enforceRateLimit(`reset:ip:${context.ipAddress ?? "unknown"}`, { max: 10 });

  const input = await parseJsonBody(req, resetPasswordSchema);
  await resetPassword(input.token, input.password, context);

  return jsonOk({
    message:
      "Senha redefinida com sucesso. Faça login com sua nova senha. Por segurança, as demais sessões foram encerradas.",
  });
});
