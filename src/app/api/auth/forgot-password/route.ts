import { handleRoute, jsonOk, parseJsonBody, enforceRateLimit } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { forgotPasswordSchema } from "@/server/modules/auth/auth.schemas";
import {
  forgotPassword,
  requestPasswordResetFromCentral,
} from "@/server/modules/auth/auth.service";
import { EMAIL_DELIVERY_ENABLED } from "@/shared/features";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  const { email } = await parseJsonBody(req, forgotPasswordSchema);

  await enforceRateLimit(`forgot:ip:${context.ipAddress ?? "unknown"}`, { max: 5 });
  await enforceRateLimit(`forgot:email:${email}`, { max: 3 });

  // Resposta SEMPRE genérica (anti-enumeração) — não revela se o e-mail existe.
  if (!EMAIL_DELIVERY_ENABLED) {
    // Sem e-mail, o pedido vai para a central, que gera uma senha provisória.
    await requestPasswordResetFromCentral(email, context);
    return jsonOk({
      message:
        "Pedido enviado para a SATGF. A central vai gerar uma senha provisória e repassar a você.",
    });
  }

  await forgotPassword(email, context);
  return jsonOk({
    message: "Se houver uma conta para este e-mail, enviaremos instruções de redefinição de senha.",
  });
});
