import { handleRoute, jsonOk, parseJsonBody, enforceRateLimit } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { forgotPasswordSchema } from "@/server/modules/auth/auth.schemas";
import { forgotPassword } from "@/server/modules/auth/auth.service";
import { Errors } from "@/server/lib/errors";
import { EMAIL_DELIVERY_ENABLED } from "@/shared/features";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  // Sem envio de e-mail, a redefinição é feita pela central.
  if (!EMAIL_DELIVERY_ENABLED) {
    throw Errors.conflict("Para redefinir sua senha, procure a SATGF.");
  }
  const context = getRequestContext(req.headers);
  const { email } = await parseJsonBody(req, forgotPasswordSchema);

  await enforceRateLimit(`forgot:ip:${context.ipAddress ?? "unknown"}`, { max: 5 });
  await enforceRateLimit(`forgot:email:${email}`, { max: 3 });

  await forgotPassword(email, context);

  // Resposta SEMPRE genérica (anti-enumeração) — não revela se o e-mail existe.
  return jsonOk({
    message: "Se houver uma conta para este e-mail, enviaremos instruções de redefinição de senha.",
  });
});
