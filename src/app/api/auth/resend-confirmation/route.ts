import { handleRoute, jsonOk, parseJsonBody, enforceRateLimit } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { resendConfirmationSchema } from "@/server/modules/auth/auth.schemas";
import { resendConfirmation } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
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
