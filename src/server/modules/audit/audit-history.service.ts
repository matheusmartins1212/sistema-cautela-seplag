import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { AUDIT_GROUPS } from "@/shared/audit-catalog";

/**
 * Histórico de ações de uma conta (rastreabilidade), mostrado só no perfil
 * dela. Lê a auditoria, que é só de leitura: nada aqui altera ou apaga.
 */

export interface AccountHistoryQuery {
  /** Chave de um grupo de AUDIT_GROUPS. */
  group?: string;
  page: number;
  pageSize: number;
}

export interface AuditHistoryItem {
  id: string;
  createdAt: Date;
  action: AuditAction;
  metadata: unknown;
  ipAddress: string | null;
  /** Registro afetado, quando ainda existe e tem tela própria. */
  target: { label: string; href: string | null } | null;
}

/** Só as ações feitas pela própria conta. */
export function buildAccountHistoryWhere(
  accountId: string,
  group?: string,
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = { actorUserId: accountId };
  const g = group ? AUDIT_GROUPS.find((x) => x.key === group) : undefined;
  if (g) where.action = { in: g.actions };
  return where;
}

export async function listAccountHistory(
  accountId: string,
  q: AccountHistoryQuery,
): Promise<{ items: AuditHistoryItem[]; total: number }> {
  const where = buildAccountHistoryWhere(accountId, q.group);
  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  const targets = await resolveTargets(rows);
  return {
    total,
    items: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      action: r.action,
      metadata: r.metadata,
      ipAddress: r.ipAddress,
      target:
        r.entityType && r.entityId ? (targets.get(`${r.entityType}:${r.entityId}`) ?? null) : null,
    })),
  };
}

type Row = { entityType: string | null; entityId: string | null };

/** Nome legível e link de cada registro afetado, em poucas consultas. */
async function resolveTargets(rows: Row[]) {
  const ids = (type: string) => [
    ...new Set(rows.filter((r) => r.entityType === type && r.entityId).map((r) => r.entityId!)),
  ];
  const map = new Map<string, { label: string; href: string | null }>();

  const [requests, cautions, vehicles, users, checklists, agencies] = await Promise.all([
    ids("VehicleRequest").length
      ? prisma.vehicleRequest.findMany({
          where: { id: { in: ids("VehicleRequest") } },
          select: { id: true, publicCode: true },
        })
      : [],
    ids("Caution").length
      ? prisma.caution.findMany({
          where: { id: { in: ids("Caution") } },
          select: { id: true, publicCode: true },
        })
      : [],
    ids("Vehicle").length
      ? prisma.vehicle.findMany({
          where: { id: { in: ids("Vehicle") } },
          select: { id: true, brand: true, model: true, plate: true },
        })
      : [],
    ids("User").length
      ? prisma.user.findMany({
          where: { id: { in: ids("User") } },
          select: { id: true, fullName: true },
        })
      : [],
    ids("Checklist").length
      ? prisma.checklist.findMany({
          where: { id: { in: ids("Checklist") } },
          select: { id: true, caution: { select: { publicCode: true } } },
        })
      : [],
    ids("Agency").length
      ? prisma.agency.findMany({
          where: { id: { in: ids("Agency") } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  for (const r of requests)
    map.set(`VehicleRequest:${r.id}`, { label: r.publicCode, href: `/admin/solicitacoes/${r.id}` });
  for (const c of cautions)
    map.set(`Caution:${c.id}`, { label: c.publicCode, href: `/admin/cautelas/${c.id}` });
  for (const v of vehicles)
    map.set(`Vehicle:${v.id}`, {
      label: `${v.brand} ${v.model} · ${v.plate}`,
      href: `/admin/veiculos/${v.id}`,
    });
  for (const u of users)
    map.set(`User:${u.id}`, { label: u.fullName, href: `/admin/usuarios/${u.id}` });
  for (const c of checklists)
    map.set(`Checklist:${c.id}`, {
      label: c.caution.publicCode,
      href: `/admin/checklists/${c.id}`,
    });
  for (const a of agencies) map.set(`Agency:${a.id}`, { label: a.name, href: "/admin/orgaos" });
  return map;
}
