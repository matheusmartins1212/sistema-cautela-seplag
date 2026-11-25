import { ChecklistStatus, DamageStatus, RequestStatus, UserStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { NavBadgeKey } from "@/components/shell/nav";

/**
 * Pendências da central mostradas no menu: pedidos a analisar, checklists
 * aguardando revisão, avarias em aberto e cadastros aguardando liberação.
 */
export async function getAdminNavBadges(): Promise<Partial<Record<NavBadgeKey, number>>> {
  const [pendingRequests, checklistsToReview, openDamages, pendingAccounts] = await Promise.all([
    prisma.vehicleRequest.count({ where: { status: RequestStatus.PENDENTE_ANALISE } }),
    prisma.checklist.count({
      where: { status: { in: [ChecklistStatus.ENVIADO, ChecklistStatus.EM_ANALISE] } },
    }),
    prisma.damageReport.count({
      where: { status: { in: [DamageStatus.ABERTA, DamageStatus.EM_ANALISE] } },
    }),
    prisma.user.count({ where: { status: UserStatus.PENDING_EMAIL_VERIFICATION } }),
  ]);
  return { pendingRequests, checklistsToReview, openDamages, pendingAccounts };
}
