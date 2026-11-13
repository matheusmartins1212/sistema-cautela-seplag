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
function resolveHref(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "VehicleRequest":
      return `/solicitacoes/${entityId}`;
    case "Caution":
      return `/cautelas/${entityId}`;
    default:
      return null;
  }
}

export function toPublicNotification(n: Notification): PublicNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.readAt !== null,
    href: resolveHref(n.relatedEntityType, n.relatedEntityId),
    createdAt: n.createdAt.toISOString(),
  };
}
