import { ChecklistStatus, DamageStatus, RequestStatus, UserStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { NavBadgeKey } from "@/components/shell/nav";

/**
 * Pendências da central mostradas no menu: pedidos a analisar, checklists
 * aguardando revisão, avarias em aberto e contas que pedem ação (cadastros a
 * liberar e pedidos de nova senha).
 */
export async function getAdminNavBadges(): Promise<Partial<Record<NavBadgeKey, number>>> {
  const [pendingRequests, checklistsToReview, openDamages, accountsAttention] = await Promise.all([
    prisma.vehicleRequest.count({ where: { status: RequestStatus.PENDENTE_ANALISE } }),
    prisma.checklist.count({
      where: { status: { in: [ChecklistStatus.ENVIADO, ChecklistStatus.EM_ANALISE] } },
    }),
    prisma.damageReport.count({
      where: { status: { in: [DamageStatus.ABERTA, DamageStatus.EM_ANALISE] } },
    }),
    prisma.user.count({
      where: {
        OR: [
          { status: UserStatus.PENDING_EMAIL_VERIFICATION },
          { status: UserStatus.ACTIVE, passwordResetRequestedAt: { not: null } },
        ],
      },
    }),
  ]);
  return { pendingRequests, checklistsToReview, openDamages, accountsAttention };
}
