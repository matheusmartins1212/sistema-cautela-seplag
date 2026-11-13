import {
  CautionStatus,
  Prisma,
  type Caution,
  type User,
  type Vehicle,
  type VehicleRequest,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";

/**
 * Agregações do calendário administrativo (seção 24). Mostra a ocupação da
 * frota por dia/turno. Restrito a ADMIN+ (garantido pelo layout /admin).
 *
 * Uma cautela "ocupa" todos os dias entre a retirada e a devolução planejadas;
 * o turno (matutino/vespertino/integral) vem da solicitação vinculada.
 */

export interface CalendarFilters {
  category?: Vehicle["category"];
  status?: CautionStatus;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day: number;
  total: number;
  matutino: number;
  vespertino: number;
  integral: number;
}

export interface CalendarMonth {
  year: number;
  month: number; // 1-12
  days: CalendarDay[];
}

const pad = (n: number) => String(n).padStart(2, "0");

function buildWhere(
  from: Date,
  toExclusive: Date,
  filters: CalendarFilters,
): Prisma.CautionWhereInput {
  const where: Prisma.CautionWhereInput = {
    plannedWithdrawalAt: { lt: toExclusive },
    plannedReturnAt: { gte: from },
  };
  // Cancelada não ocupa frota; por padrão é excluída.
  where.status = filters.status ?? { not: CautionStatus.CANCELADA };
  if (filters.category) where.vehicle = { category: filters.category };
  return where;
}

export async function getCalendarMonth(
  year: number,
  month: number,
  filters: CalendarFilters = {},
): Promise<CalendarMonth> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEndExclusive = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cautions = await prisma.caution.findMany({
    where: buildWhere(monthStart, monthEndExclusive, filters),
    select: {
      plannedWithdrawalAt: true,
      plannedReturnAt: true,
      request: { select: { shift: true } },
    },
  });

  const days: CalendarDay[] = Array.from({ length: daysInMonth }, (_, i) => ({
    date: `${year}-${pad(month)}-${pad(i + 1)}`,
    day: i + 1,
    total: 0,
    matutino: 0,
    vespertino: 0,
    integral: 0,
  }));

  for (const c of cautions) {
    // Clampa o intervalo da cautela à janela do mês.
    const start = c.plannedWithdrawalAt < monthStart ? monthStart : c.plannedWithdrawalAt;
    const lastMoment = new Date(monthEndExclusive.getTime() - 1);
    const end = c.plannedReturnAt > lastMoment ? lastMoment : c.plannedReturnAt;

    const startDay = start.getUTCDate();
    const endDay = end.getUTCDate();
    for (let d = startDay; d <= endDay; d++) {
      const bucket = days[d - 1];
      if (!bucket) continue;
      bucket.total += 1;
      if (c.request.shift === "MATUTINO") bucket.matutino += 1;
      else if (c.request.shift === "VESPERTINO") bucket.vespertino += 1;
      else bucket.integral += 1;
    }
  }

  return { year, month, days };
}

export type CalendarDayCaution = Caution & {
  vehicle: Vehicle;
  user: Pick<User, "fullName" | "registrationNumber">;
  request: Pick<VehicleRequest, "shift" | "destination">;
};

/** Cautelas que ocupam um dia específico (para o detalhamento do dia). */
export async function getCautionsOnDay(
  date: string,
  filters: CalendarFilters = {},
): Promise<CalendarDayCaution[]> {
  const [y, m, d] = date.split("-").map(Number);
  const dayStart = new Date(Date.UTC(y!, m! - 1, d!));
  const dayEndExclusive = new Date(Date.UTC(y!, m! - 1, d! + 1));

  return prisma.caution.findMany({
    where: buildWhere(dayStart, dayEndExclusive, filters),
    orderBy: { plannedWithdrawalAt: "asc" },
    include: {
      vehicle: true,
      user: { select: { fullName: true, registrationNumber: true } },
      request: { select: { shift: true, destination: true } },
    },
  }) as unknown as Promise<CalendarDayCaution[]>;
}
