import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    vehicle: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
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

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/lib/audit";
import {
  changeVehicleStatus,
  createVehicle,
  getVehicleHistory,
  listVehicles,
  updateVehicle,
} from "./vehicle.service";

const actor = {
  user: {
    id: "admin1",
    role: "ADMIN" as const,
    fullName: "Admin",
    email: "a@seplag.mt.gov.br",
    cpf: "00000000000",
    registrationNumber: "1",
    phone: "65",
    sector: "S",
    department: "D",
    status: "ACTIVE" as const,
    passwordHash: "h",
    emailVerifiedAt: new Date(),
    mustChangePassword: false,
    passwordResetRequestedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  sessionId: "s",
  expiresAt: new Date(),
} as unknown as Parameters<typeof createVehicle>[1];

const baseInput = {
  brand: "Mitsubishi",
  model: "L200",
  plate: "RRZ5I91",
  category: "PICKUP" as const,
  usageType: "ADMINISTRATIVO" as const,
  currentMileage: 0,
  internalCode: null,
  linkedSector: null,
  agency: null,
  notes: null,
};

const baseVehicle = {
  id: "v1",
  ...baseInput,
  currentStatus: "DISPONIVEL" as const,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createVehicle", () => {
  it("cria veículo e registra auditoria VEHICLE_CREATED", async () => {
    (prisma.vehicle.create as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);

    const result = await createVehicle(baseInput, actor);

    expect(result.plate).toBe("RRZ5I91");
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "VEHICLE_CREATED",
        entityType: "Vehicle",
        entityId: "v1",
      }),
    );
  });

  it("traduz violação de unicidade de placa em CONFLICT amigável", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "x",
      meta: { target: ["plate"] },
    });
    (prisma.vehicle.create as ReturnType<typeof vi.fn>).mockRejectedValue(err);

    await expect(createVehicle(baseInput, actor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

describe("listVehicles", () => {
  it("aplica filtros e paginação", async () => {
    (prisma.vehicle.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (prisma.vehicle.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      baseVehicle,
      { ...baseVehicle, id: "v2" },
    ]);

    const result = await listVehicles({
      page: 1,
      pageSize: 10,
      category: "PICKUP",
      active: true,
    });

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "PICKUP",
          active: true,
          deletedAt: null,
        }),
        skip: 0,
        take: 10,
      }),
    );
  });
});

describe("changeVehicleStatus", () => {
  it("bloqueia mudança quando veículo está em ciclo (EM_USO)", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      currentStatus: "EM_USO",
    });

    await expect(
      changeVehicleStatus("v1", { targetStatus: "BLOQUEADO", reason: "manutenção" }, actor),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(prisma.vehicle.update).not.toHaveBeenCalled();
  });

  it("registra VEHICLE_BLOCKED ao bloquear veículo disponível", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);
    (prisma.vehicle.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      currentStatus: "BLOQUEADO",
    });

    await changeVehicleStatus(
      "v1",
      { targetStatus: "BLOQUEADO", reason: "Veículo com pendência" },
      actor,
    );

    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "VEHICLE_BLOCKED",
        metadata: expect.objectContaining({
          from: "DISPONIVEL",
          to: "BLOQUEADO",
        }),
      }),
    );
  });

  it("registra VEHICLE_UNBLOCKED ao voltar de BLOQUEADO para DISPONIVEL", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      currentStatus: "BLOQUEADO",
    });
    (prisma.vehicle.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      currentStatus: "DISPONIVEL",
    });

    await changeVehicleStatus(
      "v1",
      { targetStatus: "DISPONIVEL", reason: "Pendência resolvida" },
      actor,
    );

    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "VEHICLE_UNBLOCKED" }),
    );
  });

  it("baixa o veículo marca active=false", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);
    (prisma.vehicle.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      currentStatus: "BAIXADO",
      active: false,
    });

    await changeVehicleStatus("v1", { targetStatus: "BAIXADO", reason: "Fim de vida útil" }, actor);

    expect(prisma.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentStatus: "BAIXADO", active: false }),
      }),
    );
  });
});

describe("updateVehicle", () => {
  it("ignora campos não enviados (undefined)", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);
    (prisma.vehicle.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      currentMileage: 100,
    });

    await updateVehicle("v1", { currentMileage: 100 }, actor);

    const updateMock = prisma.vehicle.update as ReturnType<typeof vi.fn>;
    const callArg = updateMock.mock.calls[0]?.[0];
    expect(callArg?.data).toEqual({ currentMileage: 100 });
  });

  it("registra changes no metadata da auditoria", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);
    (prisma.vehicle.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      model: "L200-TRITON",
    });

    await updateVehicle("v1", { model: "L200-TRITON" }, actor);

    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "VEHICLE_UPDATED",
        metadata: expect.objectContaining({
          changes: expect.objectContaining({
            model: { from: "L200", to: "L200-TRITON" },
          }),
        }),
      }),
    );
  });

  it("não registra auditoria quando nada mudou", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);
    (prisma.vehicle.update as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);

    await updateVehicle("v1", { model: "L200" }, actor);

    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe("getVehicleHistory", () => {
  it("inclui o nome de quem fez cada alteração", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);
    (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "a1",
        action: "VEHICLE_CREATED",
        actorUserId: "admin1",
        metadata: { plate: "RRZ5I91" },
        createdAt: new Date("2026-11-13T12:00:00Z"),
      },
      {
        id: "a2",
        action: "VEHICLE_UPDATED",
        actorUserId: null,
        metadata: { changes: {} },
        createdAt: new Date("2026-11-13T13:00:00Z"),
      },
    ]);
    (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "admin1", fullName: "Maria Admin" },
    ]);

    const history = await getVehicleHistory("v1");

    expect(history.map((h) => h.actorName)).toEqual(["Maria Admin", null]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["admin1"] } } }),
    );
  });
});
