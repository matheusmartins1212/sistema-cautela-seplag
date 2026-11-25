import type { UserRole } from "@prisma/client";
import { Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import { getCurrentSession, type SessionUser } from "@/server/modules/auth/session";
import { hasAtLeastRole } from "@/server/modules/auth/rbac";

/**
 * Guards de backend. São a ÚNICA fonte de verdade de autorização — o frontend
 * pode esconder itens de menu, mas o acesso real é decidido aqui.
 */

/**
 * Exige usuário autenticado e ativo. Lança UNAUTHORIZED caso contrário.
 * Com senha provisória, nada além da troca de senha (e do logout) funciona:
 * a rota de troca usa a sessão direto, sem passar por aqui.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getCurrentSession();
  if (!session) {
    throw Errors.unauthorized();
  }
  if (session.user.mustChangePassword) {
    throw Errors.passwordChangeRequired();
  }
  return session;
}

/**
 * Exige papel mínimo. Lança FORBIDDEN e registra tentativa não autorizada na
 * auditoria quando o usuário autenticado não tem privilégio suficiente.
 */
export async function requireRole(
  minimumRole: UserRole,
  context?: RequestContext,
): Promise<SessionUser> {
  const session = await requireUser();
  if (!hasAtLeastRole(session.user.role, minimumRole)) {
    await recordAudit({
      action: "UNAUTHORIZED_ACCESS_ATTEMPT",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      metadata: { requiredRole: minimumRole },
      context,
    });
    throw Errors.forbidden();
  }
  return session;
}

export const requireAdmin = (context?: RequestContext) => requireRole("ADMIN", context);
export const requireSuperAdmin = (context?: RequestContext) => requireRole("SUPER_ADMIN", context);
