import type { Notification, NotificationType, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { Errors } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";

/**
 * Notificações in-app. Persistidas em `notifications`, exibidas no painel do
 * usuário e marcadas como lidas quando ele abre. A criação é tolerante a
 * falhas: um erro de notificação não pode derrubar a operação de negócio.
 */

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function createNotification(
  input: CreateNotificationInput,
  client: PrismaLike = prisma,
): Promise<Notification | null> {
  try {
    return await client.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
      },
    });
  } catch (error) {
    logger.error("Falha ao criar notificação", {
      type: input.type,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export interface ListNotificationsResult {
  items: Notification[];
  total: number;
  unread: number;
}

export async function listMyNotifications(
  userId: string,
  options?: { onlyUnread?: boolean; limit?: number },
): Promise<ListNotificationsResult> {
  const where: Prisma.NotificationWhereInput = { userId };
  if (options?.onlyUnread) where.readAt = null;
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);

  const [items, total, unread] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { items, total, unread };
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  // Autorização: só marca como lida se for do próprio usuário.
  const result = await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count === 0) {
    // Não revelamos se a notificação existe e é de outro usuário (anti-IDOR).
    throw Errors.notFound("Notificação não encontrada.");
  }
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
