import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    vehicleRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    vehicle: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    caution: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
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
vi.mock("@/server/modules/email/email.service", () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("@/server/modules/notifications/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue(null),
}));

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/lib/audit";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import { sendTransactionalEmail } from "@/server/modules/email/email.service";
import {
  approveRequest,
  cancelMyRequest,
  createRequest,
  getRequestById,
  rejectRequest,
} from "./request.service";

const baseUser = {
  id: "u1",
  fullName: "João da Silva",
  cpf: "52998224725",
  registrationNumber: "1234",
  email: "joao@seplag.mt.gov.br",
  phone: "65999990000",
  sector: "Gestão de Frota",
  department: "Gestão de Frota",
  role: "USER" as const,
  status: "ACTIVE" as const,
  passwordHash: "h",
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const baseActor = {
  user: baseUser,
  session: { id: "s", expiresAt: new Date() },
};

const baseAdminActor = {
  user: { ...baseUser, id: "admin1", role: "ADMIN" as const },
  session: { id: "s", expiresAt: new Date() },
};

const baseRequest = {
  id: "r1",
  publicCode: "SOL-2026-06-15-AAAAAAAA",
  userId: "u1",
  withdrawalDate: new Date("2026-06-15T00:00:00.000Z"),
  returnDate: new Date("2026-06-15T00:00:00.000Z"),
  shift: "MATUTINO" as const,
  withdrawalTime: "08:00",
  returnTime: "12:00",
  destination: "Rondonópolis",
  reason: "Operação Energisa",
  termNumber: null,
  status: "PENDENTE_ANALISE" as const,
  adminId: null,
  rejectionReason: null,
  adminNotes: null,
  decidedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseInput = {
  withdrawalDate: "2026-06-15",
  returnDate: "2026-06-15",
  shift: "MATUTINO" as const,
  withdrawalTime: "08:00",
  returnTime: "12:00",
  destination: "Rondonópolis",
  reason: "Operação Energisa",
  termNumber: null,
};

const baseVehicle = {
  id: "v1",
  brand: "Mitsubishi",
  model: "L200",
  plate: "RRZ5I91",
  internalCode: null,
  category: "PICKUP" as const,
  usageType: "ADMINISTRATIVO" as const,
  linkedSector: null,
  agency: null,
  currentStatus: "DISPONIVEL" as const,
  currentMileage: 0,
  notes: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createRequest", () => {
  it("cria com publicCode SOL-* e envia e-mail de recebimento", async () => {
    (prisma.vehicleRequest.create as ReturnType<typeof vi.fn>).mockResolvedValue(baseRequest);

    const result = await createRequest(baseInput, baseActor);

    expect(result.publicCode).toMatch(/^SOL-/);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REQUEST_CREATED" }),
    );
    // E-mail é best-effort (fire-and-forget), mas precisa ter sido disparado.
    await new Promise((r) => setImmediate(r));
    expect(sendTransactionalEmail).toHaveBeenCalled();
  });

  it("tenta de novo se colidir publicCode (P2002)", async () => {
    const dup = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "x",
      meta: { target: ["publicCode"] },
    });
    (prisma.vehicleRequest.create as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(dup)
      .mockResolvedValueOnce(baseRequest);

    const result = await createRequest(baseInput, baseActor);
    expect(result.id).toBe("r1");
    expect(prisma.vehicleRequest.create).toHaveBeenCalledTimes(2);
  });
});

describe("getRequestById (anti-IDOR)", () => {
  it("dono enxerga a própria solicitação", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseRequest);
    const r = await getRequestById("r1", baseActor);
    expect(r.id).toBe("r1");
  });

  it("usuário comum NÃO consegue ver solicitação de outro (mesma mensagem 404)", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      userId: "outro",
    });
    await expect(getRequestById("r1", baseActor)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("ADMIN vê qualquer solicitação", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      userId: "outro",
    });
    const r = await getRequestById("r1", baseAdminActor);
    expect(r.id).toBe("r1");
  });
});

describe("cancelMyRequest", () => {
  it("rejeita se não for do próprio usuário", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      userId: "outro",
    });
    await expect(cancelMyRequest("r1", {}, baseActor)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejeita se status já decidido", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      status: "APROVADA",
    });
    await expect(cancelMyRequest("r1", {}, baseActor)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("cancela quando ainda PENDENTE_ANALISE", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseRequest);
    (prisma.vehicleRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      status: "CANCELADA_PELO_USUARIO",
    });
    const r = await cancelMyRequest("r1", {}, baseActor);
    expect(r.status).toBe("CANCELADA_PELO_USUARIO");
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REQUEST_CANCELLED" }),
    );
  });
});

describe("approveRequest", () => {
  beforeEach(() => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      user: baseUser,
    });
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);
    (prisma.caution.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.caution.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      publicCode: "CTL-2026-06-15-BBBBBBBB",
      status: "AGUARDANDO_RETIRADA",
    });
    (prisma.vehicleRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      status: "APROVADA",
    });
    (prisma.vehicle.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      currentStatus: "RESERVADO",
    });
  });

  it("rejeita se request não está mais em análise", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      status: "APROVADA",
      user: baseUser,
    });
    await expect(approveRequest("r1", { vehicleId: "v1" }, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejeita se veículo inativo", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      active: false,
    });
    await expect(approveRequest("r1", { vehicleId: "v1" }, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejeita se veículo não está DISPONIVEL", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      currentStatus: "EM_USO",
    });
    await expect(approveRequest("r1", { vehicleId: "v1" }, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejeita se houver cautela conflitante no período", async () => {
    (prisma.caution.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        publicCode: "CTL-OUTRO",
        plannedWithdrawalAt: new Date("2026-06-15T07:00:00.000Z"),
        plannedReturnAt: new Date("2026-06-15T13:00:00.000Z"),
      },
    ]);
    await expect(approveRequest("r1", { vehicleId: "v1" }, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(prisma.caution.create).not.toHaveBeenCalled();
  });

  it("sucesso: cria caution com CTL-*, reserva veículo, audita, notifica e envia e-mail", async () => {
    const result = await approveRequest(
      "r1",
      { vehicleId: "v1", adminNotes: "ok" },
      baseAdminActor,
    );

    expect(result.caution.publicCode).toMatch(/^CTL-/);
    expect(result.vehicle.currentStatus).toBe("RESERVADO");
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REQUEST_APPROVED" }),
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REQUEST_APPROVED" }),
    );
    await new Promise((r) => setImmediate(r));
    expect(sendTransactionalEmail).toHaveBeenCalled();
  });
});

describe("rejectRequest", () => {
  it("registra motivo, audita, notifica e envia e-mail", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      user: baseUser,
    });
    (prisma.vehicleRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      status: "NAO_APROVADA",
      rejectionReason: "Sem motorista disponível",
    });

    const result = await rejectRequest(
      "r1",
      { rejectionReason: "Sem motorista disponível" },
      baseAdminActor,
    );

    expect(result.status).toBe("NAO_APROVADA");
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REQUEST_REJECTED" }),
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REQUEST_REJECTED" }),
    );
  });

  it("rejeita se request não está mais em análise", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      status: "CANCELADA_PELO_USUARIO",
      user: baseUser,
    });
    await expect(
      rejectRequest("r1", { rejectionReason: "x" }, baseAdminActor),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
