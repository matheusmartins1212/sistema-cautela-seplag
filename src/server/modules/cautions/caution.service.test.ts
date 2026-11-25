import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    caution: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      count: vi.fn(),
    },
    checklist: {
      updateMany: vi.fn(),
    },
    vehicle: {
      update: vi.fn(),
    },
    $transaction: vi.fn(async (arg: unknown) =>
      typeof arg === "function"
        ? (arg as (tx: unknown) => unknown)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  return { prisma };
});
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/modules/notifications/notifications.service", () => ({
  createNotification: vi.fn(),
}));

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/lib/audit";
import { cancelCautionByAdmin, getCautionById, listMyCautions } from "./caution.service";

const baseActor = {
  user: {
    id: "u1",
    role: "USER" as const,
    fullName: "João",
    email: "j@seplag.mt.gov.br",
    cpf: "00000000000",
    registrationNumber: "1",
    phone: "",
    sector: "",
    department: "",
    status: "ACTIVE" as const,
    passwordHash: "h",
    emailVerifiedAt: new Date(),
    mustChangePassword: false,
    passwordResetRequestedAt: null,
    agency: null,
    isDriver: false,
    driverLicenseCategory: null,
    driverLicenseExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  session: { id: "s", expiresAt: new Date() },
};
const baseAdminActor = {
  ...baseActor,
  user: { ...baseActor.user, id: "admin1", role: "ADMIN" as const },
};

const baseCaution = {
  id: "c1",
  publicCode: "CTL-2026-06-15-AAAAAAAA",
  requestId: "r1",
  userId: "u1",
  driverId: null as string | null,
  vehicleId: "v1",
  status: "AGUARDANDO_RETIRADA" as const,
  approvedByAdminId: "admin1",
  plannedWithdrawalAt: new Date("2026-06-15T08:00:00Z"),
  plannedReturnAt: new Date("2026-06-15T12:00:00Z"),
  actualWithdrawalAt: null,
  actualReturnAt: null,
  finalNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseVehicle = {
  id: "v1",
  brand: "Mitsubishi",
  model: "L200",
  plate: "RRZ5I91",
  currentStatus: "RESERVADO" as const,
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCautionById (anti-IDOR)", () => {
  it("dono enxerga", async () => {
    (prisma.caution.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseCaution);
    const r = await getCautionById("c1", baseActor);
    expect(r.id).toBe("c1");
  });

  it("usuário comum NÃO vê cautela de outro (404 idêntico)", async () => {
    (prisma.caution.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseCaution,
      userId: "outro",
    });
    await expect(getCautionById("c1", baseActor)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("condutor escalado enxerga a viagem", async () => {
    (prisma.caution.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseCaution,
      userId: "solicitante",
      driverId: "u1",
    });
    const r = await getCautionById("c1", baseActor);
    expect(r.id).toBe("c1");
  });

  it("solicitante enxerga a viagem conduzida por outro", async () => {
    (prisma.caution.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseCaution,
      driverId: "condutor",
    });
    const r = await getCautionById("c1", baseActor);
    expect(r.id).toBe("c1");
  });

  it("ADMIN vê qualquer", async () => {
    (prisma.caution.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseCaution,
      userId: "outro",
    });
    const r = await getCautionById("c1", baseAdminActor);
    expect(r.id).toBe("c1");
  });
});

describe("listMyCautions", () => {
  it("lista as viagens que o usuário conduz (e cautelas antigas sem condutor)", async () => {
    (prisma.caution.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.caution.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await listMyCautions({ page: 1, pageSize: 10 }, baseActor);
    expect(prisma.caution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ driverId: "u1" }, { driverId: null, userId: "u1" }],
        }),
      }),
    );
  });
});

type Mock = ReturnType<typeof vi.fn>;

function mockCancelFlow(status: string, vehicleStatus: string, otherActive: string[] = []) {
  (prisma.caution.findUnique as Mock).mockResolvedValue({
    ...baseCaution,
    status,
    vehicle: { ...baseVehicle, currentStatus: vehicleStatus },
  });
  (prisma.caution.updateMany as Mock).mockResolvedValue({ count: 1 });
  (prisma.checklist.updateMany as Mock).mockResolvedValue({ count: 0 });
  // Cautelas ativas restantes do mesmo veículo (a cancelada já não conta).
  (prisma.caution.findMany as Mock).mockResolvedValue(otherActive.map((s) => ({ status: s })));
  (prisma.caution.findUniqueOrThrow as Mock).mockResolvedValue({
    ...baseCaution,
    status: "CANCELADA",
  });
  (prisma.vehicle.update as Mock).mockResolvedValue({});
}

describe("cancelCautionByAdmin", () => {
  it("cancela quando AGUARDANDO_RETIRADA e devolve veículo para DISPONIVEL", async () => {
    mockCancelFlow("AGUARDANDO_RETIRADA", "RESERVADO");

    await cancelCautionByAdmin("c1", { reason: "Demanda cancelada" }, baseAdminActor);

    expect(prisma.caution.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELADA" }),
      }),
    );
    expect(prisma.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentStatus: "DISPONIVEL" }),
      }),
    );
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CAUTION_CANCELLED" }),
    );
  });

  it.each(["EM_USO", "AGUARDANDO_DEVOLUCAO", "DEVOLUCAO_EM_ANALISE", "ATRASADA"])(
    "cancela cautela em %s e libera o veículo",
    async (status) => {
      mockCancelFlow(status, status === "EM_USO" ? "EM_USO" : "AGUARDANDO_DEVOLUCAO");

      await cancelCautionByAdmin("c1", { reason: "Lançada por engano" }, baseAdminActor);

      expect(prisma.caution.updateMany).toHaveBeenCalled();
      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentStatus: "DISPONIVEL" }),
        }),
      );
    },
  );

  it("cancela checklists ainda não enviados", async () => {
    mockCancelFlow("RETIRADA_EM_ANDAMENTO", "RESERVADO");
    await cancelCautionByAdmin("c1", { reason: "ok" }, baseAdminActor);
    expect(prisma.checklist.updateMany).toHaveBeenCalledWith({
      where: { cautionId: "c1", status: { in: ["PENDENTE", "EM_PREENCHIMENTO"] } },
      data: { status: "CANCELADO" },
    });
  });

  it("NÃO libera o veículo se outra cautela ativa usa o mesmo carro", async () => {
    mockCancelFlow("AGUARDANDO_RETIRADA", "EM_USO", ["EM_USO"]);
    await cancelCautionByAdmin("c1", { reason: "ok" }, baseAdminActor);
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
  });

  it("deixa o veículo reservado se ainda há reserva futura aprovada para ele", async () => {
    mockCancelFlow("EM_USO", "EM_USO", ["AGUARDANDO_RETIRADA"]);
    await cancelCautionByAdmin("c1", { reason: "ok" }, baseAdminActor);
    expect(prisma.vehicle.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { currentStatus: "RESERVADO" },
    });
  });

  it.each(["FINALIZADA", "FINALIZADA_COM_OBSERVACAO", "CANCELADA"])(
    "rejeita cautela já %s",
    async (status) => {
      mockCancelFlow(status, "DISPONIVEL");
      await expect(
        cancelCautionByAdmin("c1", { reason: "x" }, baseAdminActor),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(prisma.caution.updateMany).not.toHaveBeenCalled();
    },
  );

  it("rejeita se a cautela foi encerrada entre a leitura e o cancelamento", async () => {
    mockCancelFlow("DEVOLUCAO_EM_ANALISE", "AGUARDANDO_DEVOLUCAO");
    (prisma.caution.updateMany as Mock).mockResolvedValue({ count: 0 });
    await expect(cancelCautionByAdmin("c1", { reason: "x" }, baseAdminActor)).rejects.toMatchObject(
      { code: "CONFLICT" },
    );
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
  });

  it("NÃO mexe no status do veículo se ele está fora do fluxo (ex.: manutenção)", async () => {
    mockCancelFlow("AGUARDANDO_RETIRADA", "EM_MANUTENCAO");
    await cancelCautionByAdmin("c1", { reason: "ok" }, baseAdminActor);
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
  });
});
