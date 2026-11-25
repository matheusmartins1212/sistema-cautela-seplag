import { handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { Errors } from "@/server/lib/errors";
import { getCurrentSession } from "@/server/modules/auth/session";
import { changeTemporaryPasswordSchema } from "@/server/modules/auth/auth.schemas";
import { changeTemporaryPassword } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";

/**
 * Troca obrigatória da senha provisória. Usa a sessão direto (não `requireUser`),
 * porque `requireUser` bloqueia tudo enquanto a troca estiver pendente.
 */
export const POST = handleRoute(async (req) => {
  const context = getRequestContext(req.headers);
  const session = await getCurrentSession();
  if (!session) throw Errors.unauthorized();
  const { password } = await parseJsonBody(req, changeTemporaryPasswordSchema);
  await changeTemporaryPassword(session.user.id, password, context);
  return jsonOk({ changed: true, role: session.user.role });
});
