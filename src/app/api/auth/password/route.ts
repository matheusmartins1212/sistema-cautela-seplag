import { enforceRateLimit, handleRoute, jsonOk, parseJsonBody } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireUser } from "@/server/modules/auth/guards";
import { changeOwnPasswordSchema } from "@/server/modules/auth/auth.schemas";
import { changeOwnPassword } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";

/** Troca da própria senha pelo perfil (servidor e central). */
export const POST = handleRoute(async (req) => {
  const actor = await requireUser();
  const context = getRequestContext(req.headers);
  // Limita tentativas de adivinhar a senha atual com a sessão aberta.
  await enforceRateLimit(`password-change:user:${actor.user.id}`, { max: 5 });
  const { currentPassword, password } = await parseJsonBody(req, changeOwnPasswordSchema);
  await changeOwnPassword(actor.user.id, actor.session.id, currentPassword, password, context);
  return jsonOk({ changed: true });
});
