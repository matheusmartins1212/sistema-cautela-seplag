import type { AuditAction, UserRole, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/lib/logger";
import type { RequestContext } from "@/server/lib/request-context";

/**
 * Registro de auditoria para ações sensíveis (seção 5.7).
 *
 * `metadata` deve conter apenas dados NÃO sensíveis (jamais CPF completo, senha
 * ou token). A escrita é tolerante a falhas: um erro de auditoria não pode
 * derrubar a operação de negócio — apenas é logado.
 */
export interface AuditInput {
  action: AuditAction;
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  context?: RequestContext;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ipAddress: input.context?.ipAddress ?? null,
        userAgent: input.context?.userAgent ?? null,
      },
    });
  } catch (error) {
    logger.error("Falha ao registrar auditoria", {
      action: input.action,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
