import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    vehicle: { groupBy: vi.fn() },
    caution: { groupBy: vi.fn() },
    vehicleRequest: { count: vi.fn() },
    damageReport: { count: vi.fn() },
    $transaction: vi.fn(async (arr: Promise<unknown>[]) => Promise.all(arr)),
  };
  return { prisma };
});

import { prisma } from "@/server/db/prisma";
import { getAdminDashboard } from "./dashboard.service";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.vehicle.groupBy).mockResolvedValue([
    { currentStatus: "DISPONIVEL", _count: { _all: 5 } },
    { currentStatus: "EM_USO", _count: { _all: 2 } },
    { currentStatus: "EM_MANUTENCAO", _count: { _all: 1 } },
  ] as never);
  vi.mocked(prisma.caution.groupBy).mockResolvedValue([
    { status: "EM_USO", _count: { _all: 2 } },
    { status: "ATRASADA", _count: { _all: 1 } },
    { status: "FINALIZADA", _count: { _all: 4 } },
  ] as never);
  vi.mocked(prisma.vehicleRequest.count).mockResolvedValue(3 as never);
  vi.mocked(prisma.damageReport.count).mockResolvedValue(2 as never);
});

describe("getAdminDashboard", () => {
  it("soma e deriva as contagens de veículos", async () => {
    const d = await getAdminDashboard();
    expect(d.vehicles.total).toBe(8);
    expect(d.vehicles.available).toBe(5);
    expect(d.vehicles.inUse).toBe(2);
    expect(d.vehicles.maintenance).toBe(1);
    // zero-fill em status não retornados
    expect(d.vehicles.byStatus.BLOQUEADO).toBe(0);
  });

  it("conta apenas estados ativos como cautelas ativas e separa atrasadas", async () => {
    const d = await getAdminDashboard();
    // EM_USO(2) + ATRASADA(1) = 3; FINALIZADA não conta como ativa
    expect(d.cautions.active).toBe(3);
    expect(d.cautions.overdue).toBe(1);
    expect(d.cautions.byStatus.FINALIZADA).toBe(4);
  });

  it("repassa solicitações pendentes e avarias abertas", async () => {
    const d = await getAdminDashboard();
    expect(d.requests.pending).toBe(3);
    expect(d.damages.open).toBe(2);
  });
});
