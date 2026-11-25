import { handleRoute, jsonOk, parseJsonBody, enforceRateLimit } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { resendConfirmationSchema } from "@/server/modules/auth/auth.schemas";
import { resendConfirmation } from "@/server/modules/auth/auth.service";
import { Errors } from "@/server/lib/errors";
import { EMAIL_DELIVERY_ENABLED } from "@/shared/features";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  // Sem envio de e-mail, o cadastro é liberado pela central.
  if (!EMAIL_DELIVERY_ENABLED) {
    throw Errors.conflict("Seu cadastro é liberado pela SATGF. Aguarde a aprovação.");
  }
  const context = getRequestContext(req.headers);
  const { email } = await parseJsonBody(req, resendConfirmationSchema);

  // Rate limit por IP e por e-mail (reenvio controlado).
  await enforceRateLimit(`resend:ip:${context.ipAddress ?? "unknown"}`, { max: 5 });
  await enforceRateLimit(`resend:email:${email}`, { max: 3 });

  await resendConfirmation(email, context);

  // Resposta SEMPRE genérica (anti-enumeração).
  return jsonOk({
    message: "Se houver um cadastro pendente para este e-mail, enviaremos uma nova confirmação.",
  });
});
