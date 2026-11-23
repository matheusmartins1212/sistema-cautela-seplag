import type { Notification, NotificationType } from "@prisma/client";

/**
 * Representação de notificação para o cliente. O destino (`href`) é derivado no
 * servidor a partir da entidade relacionada — o cliente nunca monta rotas a
 * partir de dados crus.
 */
export interface PublicNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  href: string | null;
  createdAt: string;
}

/** Mapeia a entidade relacionada para a rota de detalhe correspondente. */
function resolveHref(
  entityType: string | null,
  entityId: string | null,
  audience: NotificationAudience,
): string | null {
  if (!entityType || !entityId) return null;
  // Administradores usam só o painel administrativo; servidores, a área deles.
  const base = audience === "admin" ? "/admin" : "";
  switch (entityType) {
    case "VehicleRequest":
      return `${base}/solicitacoes/${entityId}`;
    case "Caution":
      return `${base}/cautelas/${entityId}`;
    default:
      return null;
  }
}

export type NotificationAudience = "user" | "admin";

export function toPublicNotification(
  n: Notification,
  audience: NotificationAudience = "user",
): PublicNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.readAt !== null,
    href: resolveHref(n.relatedEntityType, n.relatedEntityId, audience),
    createdAt: n.createdAt.toISOString(),
  };
}
