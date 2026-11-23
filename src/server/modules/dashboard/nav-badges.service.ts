import { ChecklistStatus, DamageStatus, RequestStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { NavBadgeKey } from "@/components/shell/nav";

/**
 * Pendências da central mostradas no menu: pedidos a analisar, checklists
 * aguardando revisão e avarias em aberto. Três contagens simples.
 */
export async function getAdminNavBadges(): Promise<Partial<Record<NavBadgeKey, number>>> {
  const [pendingRequests, checklistsToReview, openDamages] = await Promise.all([
    prisma.vehicleRequest.count({ where: { status: RequestStatus.PENDENTE_ANALISE } }),
    prisma.checklist.count({
      where: { status: { in: [ChecklistStatus.ENVIADO, ChecklistStatus.EM_ANALISE] } },
    }),
    prisma.damageReport.count({
      where: { status: { in: [DamageStatus.ABERTA, DamageStatus.EM_ANALISE] } },
    }),
  ]);
  return { pendingRequests, checklistsToReview, openDamages };
}
