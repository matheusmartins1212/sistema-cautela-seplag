import {
  CautionStatus,
  DamageStatus,
  RequestStatus,
  VehicleStatus,
  type Caution,
  type Vehicle,
  type VehicleRequest,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { responsibleWhere } from "@/server/modules/cautions/responsible";

/**
 * Agregações para o painel administrativo (SATGF/SEPLAG). Apenas contagens — não
 * expõe dados pessoais. A autorização é garantida pelo layout /admin (ADMIN+).
 */

const ACTIVE_CAUTION_STATUSES: CautionStatus[] = [
  CautionStatus.AGUARDANDO_RETIRADA,
  CautionStatus.RETIRADA_EM_ANDAMENTO,
  CautionStatus.EM_USO,
  CautionStatus.AGUARDANDO_DEVOLUCAO,
  CautionStatus.DEVOLUCAO_EM_ANALISE,
  CautionStatus.ATRASADA,
];

const OPEN_DAMAGE_STATUSES: DamageStatus[] = [DamageStatus.ABERTA, DamageStatus.EM_ANALISE];

export interface AdminDashboard {
  vehicles: {
    total: number;
    available: number;
    inUse: number;
    maintenance: number;
    byStatus: Record<VehicleStatus, number>;
  };
  cautions: {
    active: number;
    overdue: number;
    byStatus: Record<CautionStatus, number>;
  };
  requests: { pending: number };
  damages: { open: number };
}

function zeroFill<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  // Leituras independentes e somente-leitura — Promise.all (sem necessidade de
  // transação atômica) e preserva a tipagem precisa do groupBy.
  const [vehicleGroups, cautionGroups, pending, open] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ["currentStatus"],
      _count: { _all: true },
      where: { deletedAt: null },
      orderBy: { currentStatus: "asc" },
    }),
    prisma.caution.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.vehicleRequest.count({
      where: { status: RequestStatus.PENDENTE_ANALISE },
    }),
    prisma.damageReport.count({
      where: { status: { in: OPEN_DAMAGE_STATUSES } },
    }),
  ]);

  const vehicleByStatus = zeroFill(Object.values(VehicleStatus));
  let vehicleTotal = 0;
  for (const g of vehicleGroups) {
    vehicleByStatus[g.currentStatus] = g._count._all;
    vehicleTotal += g._count._all;
  }

  const cautionByStatus = zeroFill(Object.values(CautionStatus));
  for (const g of cautionGroups) {
    cautionByStatus[g.status] = g._count._all;
  }
  const cautionActive = ACTIVE_CAUTION_STATUSES.reduce(
    (sum, status) => sum + cautionByStatus[status],
    0,
  );

  return {
    vehicles: {
      total: vehicleTotal,
      available: vehicleByStatus[VehicleStatus.DISPONIVEL],
      inUse: vehicleByStatus[VehicleStatus.EM_USO],
      maintenance: vehicleByStatus[VehicleStatus.EM_MANUTENCAO],
      byStatus: vehicleByStatus,
    },
    cautions: {
      active: cautionActive,
      overdue: cautionByStatus[CautionStatus.ATRASADA],
      byStatus: cautionByStatus,
    },
    requests: { pending },
    damages: { open },
  };
}

export type RecentCaution = Pick<
  Caution,
  "id" | "publicCode" | "status" | "plannedWithdrawalAt"
> & {
  vehicle: Pick<Vehicle, "brand" | "model" | "plate">;
  request: Pick<VehicleRequest, "origin" | "destination">;
};

export type RecentRequest = Pick<
  VehicleRequest,
  "id" | "publicCode" | "status" | "withdrawalDate" | "withdrawalTime" | "destination"
>;

export interface DriverDashboard {
  scheduledTrips: number;
  tripsInProgress: number;
  overdueTrips: number;
  nextTrips: RecentCaution[];
}

export interface UserDashboard {
  pendingRequests: number;
  approvedRequests: number;
  recentRequests: RecentRequest[];
  /** Presente só para quem é condutor da central (ou tem cautelas antigas). */
  driver: DriverDashboard | null;
}

const SCHEDULED_TRIP_STATUSES: CautionStatus[] = [
  CautionStatus.AGUARDANDO_RETIRADA,
  CautionStatus.RETIRADA_EM_ANDAMENTO,
];

const IN_PROGRESS_TRIP_STATUSES: CautionStatus[] = [
  CautionStatus.EM_USO,
  CautionStatus.AGUARDANDO_DEVOLUCAO,
  CautionStatus.DEVOLUCAO_EM_ANALISE,
];

async function getDriverDashboard(userId: string): Promise<DriverDashboard> {
  const mine = responsibleWhere(userId);
  const [scheduledTrips, tripsInProgress, overdueTrips, nextTrips] = await Promise.all([
    prisma.caution.count({ where: { ...mine, status: { in: SCHEDULED_TRIP_STATUSES } } }),
    prisma.caution.count({ where: { ...mine, status: { in: IN_PROGRESS_TRIP_STATUSES } } }),
    prisma.caution.count({ where: { ...mine, status: CautionStatus.ATRASADA } }),
    prisma.caution.findMany({
      where: { ...mine, status: { in: ACTIVE_CAUTION_STATUSES } },
      orderBy: { plannedWithdrawalAt: "asc" },
      take: 5,
      select: {
        id: true,
        publicCode: true,
        status: true,
        plannedWithdrawalAt: true,
        vehicle: { select: { brand: true, model: true, plate: true } },
        request: { select: { origin: true, destination: true } },
      },
    }),
  ]);
  return { scheduledTrips, tripsInProgress, overdueTrips, nextTrips };
}

/** Resumo da área do usuário (somente os próprios dados). */
export async function getUserDashboard(user: {
  id: string;
  isDriver: boolean;
}): Promise<UserDashboard> {
  const [pendingRequests, approvedRequests, recentRequests, legacyTrips] = await Promise.all([
    prisma.vehicleRequest.count({
      where: { userId: user.id, status: RequestStatus.PENDENTE_ANALISE },
    }),
    prisma.vehicleRequest.count({
      where: { userId: user.id, status: RequestStatus.APROVADA },
    }),
    prisma.vehicleRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        publicCode: true,
        status: true,
        withdrawalDate: true,
        withdrawalTime: true,
        destination: true,
      },
    }),
    // Quem não é condutor só vê o bloco de viagens se ainda tiver cautela
    // antiga ativa (em que ele mesmo dirigia).
    user.isDriver
      ? Promise.resolve(0)
      : prisma.caution.count({
          where: {
            ...responsibleWhere(user.id),
            status: { in: ACTIVE_CAUTION_STATUSES },
          },
        }),
  ]);

  const driver = user.isDriver || legacyTrips > 0 ? await getDriverDashboard(user.id) : null;

  return { pendingRequests, approvedRequests, recentRequests, driver };
}
