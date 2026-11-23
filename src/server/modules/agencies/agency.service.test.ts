import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    agency: { findUnique: vi.fn(), delete: vi.fn() },
    user: { count: vi.fn() },
    vehicleRequest: { count: vi.fn() },
  },
}));
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn() }));

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/lib/audit";
import { deleteAgency } from "./agency.service";

const actor = { user: { id: "adm1", role: "SUPER_ADMIN" } } as never;
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe("deleteAgency", () => {
  beforeEach(() => vi.clearAllMocks());

  it("remove e registra na auditoria quem removeu e o que ainda citava o órgão", async () => {
    mock(prisma.agency.findUnique).mockResolvedValue({
      id: "a1",
      name: "SES - Saúde",
      active: true,
    });
    mock(prisma.user.count).mockResolvedValue(3);
    mock(prisma.vehicleRequest.count).mockResolvedValue(5);

    await deleteAgency("a1", actor, { ipAddress: "10.0.0.1", userAgent: "x" } as never);

    expect(prisma.agency.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "AGENCY_DELETED",
        actorUserId: "adm1",
        entityType: "Agency",
        entityId: "a1",
        metadata: {
          name: "SES - Saúde",
          wasActive: true,
          usersWithAgency: 3,
          requestsWithAgency: 5,
        },
      }),
    );
  });

  it("órgão inexistente: não apaga nada nem registra", async () => {
    mock(prisma.agency.findUnique).mockResolvedValue(null);
    await expect(deleteAgency("x", actor)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(prisma.agency.delete).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });
});
