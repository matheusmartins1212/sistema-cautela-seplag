import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db/prisma", () => ({
  prisma: { caution: { findMany: vi.fn() } },
}));

import { prisma } from "@/server/db/prisma";
import { getCalendarMonth } from "./calendar.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCalendarMonth", () => {
  it("conta todos os dias que a cautela ocupa, por turno", async () => {
    vi.mocked(prisma.caution.findMany).mockResolvedValue([
      {
        plannedWithdrawalAt: new Date("2026-06-05T08:00:00Z"),
        plannedReturnAt: new Date("2026-06-07T18:00:00Z"),
        request: { shift: "MATUTINO" },
      },
      {
        plannedWithdrawalAt: new Date("2026-06-15T13:00:00Z"),
        plannedReturnAt: new Date("2026-06-15T19:00:00Z"),
        request: { shift: "VESPERTINO" },
      },
    ] as never);

    const cal = await getCalendarMonth(2026, 6, {});

    expect(cal.days).toHaveLength(30);
    // dias 5, 6 e 7 ocupados no matutino
    for (const day of [5, 6, 7]) {
      expect(cal.days[day - 1]).toMatchObject({ total: 1, matutino: 1 });
    }
    // dia 15 vespertino
    expect(cal.days[14]).toMatchObject({ total: 1, vespertino: 1 });
    // dia sem cautela
    expect(cal.days[9]).toMatchObject({ total: 0 });
  });

  it("recorta cautelas que começam antes do mês (clamp em dia 1)", async () => {
    vi.mocked(prisma.caution.findMany).mockResolvedValue([
      {
        plannedWithdrawalAt: new Date("2026-05-30T08:00:00Z"),
        plannedReturnAt: new Date("2026-06-02T18:00:00Z"),
        request: { shift: "INTEGRAL" },
      },
    ] as never);

    const cal = await getCalendarMonth(2026, 6, {});
    expect(cal.days[0]).toMatchObject({ total: 1, integral: 1 }); // dia 1
    expect(cal.days[1]).toMatchObject({ total: 1, integral: 1 }); // dia 2
    expect(cal.days[2]).toMatchObject({ total: 0 }); // dia 3
  });

  it("por padrão exclui canceladas no filtro", async () => {
    vi.mocked(prisma.caution.findMany).mockResolvedValue([] as never);
    await getCalendarMonth(2026, 6, {});
    const where = vi.mocked(prisma.caution.findMany).mock.calls[0]?.[0]?.where;
    expect(where?.status).toEqual({ not: "CANCELADA" });
  });
});
