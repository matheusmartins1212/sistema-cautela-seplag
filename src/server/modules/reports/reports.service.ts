import { CautionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

/**
 * Relatórios administrativos básicos (seções 27 e 31). Agregações por período.
 * Restrito a ADMIN+ (garantido pelo layout/guard). Sem dados pessoais além do
 * necessário para gestão (nome do setor, identificação do veículo).
 */

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface VehicleUsageRow {
  vehicleId: string;
  label: string; // marca + modelo
  plate: string;
  count: number;
}

export interface SectorRow {
  department: string;
  count: number;
}

export interface AgencyRow {
  agency: string;
  count: number;
}

export interface DriverRow {
  driver: string;
  count: number;
}

export interface DamageByVehicleRow {
  vehicleId: string;
  plate: string;
  count: number;
}

function rangeWhere(range: DateRange): Prisma.DateTimeFilter | undefined {
  if (!range.from && !range.to) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (range.from) filter.gte = range.from;
  if (range.to) filter.lte = range.to;
  return filter;
}

export interface CautionStats {
  vehicleUsage: VehicleUsageRow[];
  bySector: SectorRow[];
  byAgency: AgencyRow[];
  byDriver: DriverRow[];
}

const NO_AGENCY = "Sem órgão informado";
const NO_DRIVER = "Solicitante (cautela)";

function sortedCounts(map: Map<string, number>): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Uma única leitura das viagens do período alimenta os relatórios: uso por
 * veículo, por setor/lotação, por órgão solicitante e por condutor.
 */
export async function getCautionStats(range: DateRange): Promise<CautionStats> {
  const planned = rangeWhere(range);
  const cautions = await prisma.caution.findMany({
    where: {
      status: { not: CautionStatus.CANCELADA },
      ...(planned ? { plannedWithdrawalAt: planned } : {}),
    },
    select: {
      vehicleId: true,
      vehicle: { select: { brand: true, model: true, plate: true } },
      user: { select: { department: true, agency: true } },
      driver: { select: { fullName: true } },
      request: { select: { requestingAgency: true } },
    },
  });

  const usage = new Map<string, VehicleUsageRow>();
  const sectors = new Map<string, number>();
  const agencies = new Map<string, number>();
  const drivers = new Map<string, number>();
  for (const c of cautions) {
    const u = usage.get(c.vehicleId);
    if (u) u.count += 1;
    else
      usage.set(c.vehicleId, {
        vehicleId: c.vehicleId,
        label: `${c.vehicle.brand} ${c.vehicle.model}`,
        plate: c.vehicle.plate,
        count: 1,
      });

    const dep = c.user.department || "—";
    sectors.set(dep, (sectors.get(dep) ?? 0) + 1);

    const agency = c.request.requestingAgency ?? c.user.agency ?? NO_AGENCY;
    agencies.set(agency, (agencies.get(agency) ?? 0) + 1);

    const driver = c.driver?.fullName ?? NO_DRIVER;
    drivers.set(driver, (drivers.get(driver) ?? 0) + 1);
  }

  return {
    vehicleUsage: [...usage.values()].sort((a, b) => b.count - a.count),
    bySector: sortedCounts(sectors).map(([department, count]) => ({ department, count })),
    byAgency: sortedCounts(agencies).map(([agency, count]) => ({ agency, count })),
    byDriver: sortedCounts(drivers).map(([driver, count]) => ({ driver, count })),
  };
}

export async function getDamagesByVehicle(range: DateRange): Promise<DamageByVehicleRow[]> {
  const created = rangeWhere(range);
  const damages = await prisma.damageReport.findMany({
    where: { ...(created ? { createdAt: created } : {}) },
    select: { vehicleId: true, vehicle: { select: { plate: true } } },
  });

  const map = new Map<string, DamageByVehicleRow>();
  for (const d of damages) {
    const row = map.get(d.vehicleId);
    if (row) row.count += 1;
    else map.set(d.vehicleId, { vehicleId: d.vehicleId, plate: d.vehicle.plate, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
