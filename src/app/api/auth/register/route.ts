import { handleRoute, jsonOk, parseJsonBody, enforceRateLimit } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { registerSchema } from "@/server/modules/auth/auth.schemas";
import { registerUser } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";

export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  await enforceRateLimit(`register:ip:${context.ipAddress ?? "unknown"}`, {
    max: 10,
  });

  const input = await parseJsonBody(req, registerSchema);
  await registerUser(input, context);

  // Resposta genérica — não confirma nem nega detalhes além do necessário.
  return jsonOk(
    {
      message:
        "Cadastro recebido. Enviamos um e-mail de confirmação para o endereço institucional informado.",
    },
    201,
  );
});
