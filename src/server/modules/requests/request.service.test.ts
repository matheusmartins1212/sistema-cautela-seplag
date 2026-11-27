import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    vehicleRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      count: vi.fn(),
    },
    vehicle: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    agency: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    caution: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(async () => [{ ok: 1 }]),
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
  sendEmailAfterResponse: vi.fn(),
}));
vi.mock("@/server/modules/notifications/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue(null),
}));

import { prisma } from "@/server/db/prisma";

beforeEach(() => {
  (prisma.vehicleRequest.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
});
import { recordAudit } from "@/server/lib/audit";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import { sendEmailAfterResponse } from "@/server/modules/email/email.service";
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
  mustChangePassword: false,
  passwordResetRequestedAt: null,
  agency: null,
  isDriver: false,
  driverLicenseCategory: null,
  driverLicenseExpiresAt: null,
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
  origin: "SEPLAG - Centro Político Administrativo",
  destination: "Rondonópolis",
  reason: "Operação Energisa",
  passengerCount: 3,
  passengerNames: null,
  contactPhone: "65999990000",
  requestingAgency: "SEPLAG",
  withDriver: true,
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
  withdrawalTime: "08:00",
  returnTime: "12:00",
  origin: "SEPLAG - Centro Político Administrativo",
  destination: "Rondonópolis",
  reason: "Operação Energisa",
  passengers: ["Ana Paula Souza", "Bruno Lima", "Carla Dias"],
  withDriver: true,
  termNumber: null,
};

const baseDriver = {
  ...baseUser,
  id: "d1",
  fullName: "Carlos Condutor",
  email: "carlos@seplag.mt.gov.br",
  phone: "65988887777",
  isDriver: true,
  driverLicenseCategory: "D",
  driverLicenseExpiresAt: null,
};

const approveInput = { vehicleId: "v1", driverId: "d1" };

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
  beforeEach(() => {
    (prisma.agency.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("cria com publicCode SOL-* e envia e-mail de recebimento", async () => {
    (prisma.vehicleRequest.create as ReturnType<typeof vi.fn>).mockResolvedValue(baseRequest);

    const result = await createRequest(baseInput, baseActor);

    expect(result.publicCode).toMatch(/^SOL-/);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REQUEST_CREATED" }),
    );
    // E-mail é best-effort (fire-and-forget), mas precisa ter sido disparado.
    await new Promise((r) => setImmediate(r));
    expect(sendEmailAfterResponse).toHaveBeenCalled();
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

describe("createRequest (dados do transporte)", () => {
  beforeEach(() => {
    (prisma.vehicleRequest.create as ReturnType<typeof vi.fn>).mockResolvedValue(baseRequest);
    (prisma.agency.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  function createdData() {
    return (prisma.vehicleRequest.create as ReturnType<typeof vi.fn>).mock.calls[0]![0].data;
  }

  it("grava saída, passageiros e deduz o turno quando não informado", async () => {
    await createRequest({ ...baseInput, withdrawalTime: "13:00", returnTime: "17:00" }, baseActor);
    const data = createdData();
    expect(data.origin).toBe(baseInput.origin);
    expect(data.passengerCount).toBe(3);
    expect(data.passengerNames).toBe("Ana Paula Souza\nBruno Lima\nCarla Dias");
    expect(data.shift).toBe("VESPERTINO");
    // Sem telefone informado, usa o do cadastro.
    expect(data.contactPhone).toBe(baseUser.phone);
  });

  it("pedido sem condutor grava sem passageiros", async () => {
    await createRequest(
      { ...baseInput, withDriver: false, origin: null, passengers: null },
      baseActor,
    );
    const data = createdData();
    expect(data.passengerCount).toBeNull();
    expect(data.passengerNames).toBeNull();
  });

  it("usa o órgão do cadastro do solicitante, ignorando o informado", async () => {
    const actor = { ...baseActor, user: { ...baseUser, agency: "SEPLAG" } };
    await createRequest({ ...baseInput, agency: "OUTRO ÓRGÃO" }, actor);
    expect(createdData().requestingAgency).toBe("SEPLAG");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("conta antiga sem órgão: valida no catálogo e grava na conta", async () => {
    (prisma.agency.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    await createRequest({ ...baseInput, agency: "SEFAZ" }, baseActor);
    expect(createdData().requestingAgency).toBe("SEFAZ");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { agency: "SEFAZ" },
    });
  });

  it("rejeita órgão fora do catálogo", async () => {
    (prisma.agency.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(
      createRequest({ ...baseInput, agency: "INVENTADO" }, baseActor),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(prisma.vehicleRequest.create).not.toHaveBeenCalled();
  });

  it("exige órgão quando a central já tem órgãos cadastrados", async () => {
    (prisma.agency.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "a1", name: "SEPLAG" },
    ]);
    await expect(createRequest(baseInput, baseActor)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("com catálogo vazio, aceita sem órgão", async () => {
    await createRequest(baseInput, baseActor);
    expect(createdData().requestingAgency).toBeNull();
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
    (prisma.vehicleRequest.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
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
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseDriver);
    (prisma.caution.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.caution.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      publicCode: "CTL-2026-06-15-BBBBBBBB",
      status: "AGUARDANDO_RETIRADA",
    });
    (prisma.vehicleRequest.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
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
    await expect(approveRequest("r1", approveInput, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejeita se veículo inativo", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      active: false,
    });
    await expect(approveRequest("r1", approveInput, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it.each(["EM_MANUTENCAO", "BLOQUEADO", "BAIXADO", "INATIVO"])(
    "rejeita se veículo está %s",
    async (status) => {
      (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...baseVehicle,
        currentStatus: status,
      });
      await expect(approveRequest("r1", approveInput, baseAdminActor)).rejects.toMatchObject({
        code: "CONFLICT",
      });
    },
  );

  it("aprova reserva futura com o carro em uso, sem mudar o status atual dele", async () => {
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseVehicle,
      currentStatus: "EM_USO",
    });
    const result = await approveRequest("r1", approveInput, baseAdminActor);
    expect(result.caution.publicCode).toMatch(/^CTL-/);
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
    expect(result.vehicle.currentStatus).toBe("EM_USO");
  });

  it("rejeita se houver cautela conflitante no período", async () => {
    (prisma.caution.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        publicCode: "CTL-OUTRO",
        plannedWithdrawalAt: new Date("2026-06-15T07:00:00.000Z"),
        plannedReturnAt: new Date("2026-06-15T13:00:00.000Z"),
      },
    ]);
    await expect(approveRequest("r1", approveInput, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(prisma.caution.create).not.toHaveBeenCalled();
  });

  it("sucesso: cria caution com CTL-*, reserva veículo, audita, notifica e envia e-mail", async () => {
    const result = await approveRequest(
      "r1",
      { ...approveInput, adminNotes: "ok" },
      baseAdminActor,
    );

    expect(result.caution.publicCode).toMatch(/^CTL-/);
    expect(result.vehicle.currentStatus).toBe("RESERVADO");
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REQUEST_APPROVED" }),
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REQUEST_APPROVED", userId: "u1" }),
    );
    await new Promise((r) => setImmediate(r));
    expect(sendEmailAfterResponse).toHaveBeenCalled();
  });

  it("escala o condutor na viagem e avisa o condutor", async () => {
    const result = await approveRequest("r1", approveInput, baseAdminActor);

    expect(prisma.caution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ driverId: "d1", userId: "u1" }),
      }),
    );
    expect(result.driver?.id).toBe("d1");
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TRIP_ASSIGNED", userId: "d1" }),
    );
    // Solicitante e condutor recebem e-mail, além da notificação na plataforma.
    const templates = (sendEmailAfterResponse as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0].template,
    );
    expect(templates).toEqual(expect.arrayContaining(["REQUEST_APPROVED", "TRIP_ASSIGNED"]));
  });

  it("pedido com condutor exige escolher o condutor", async () => {
    await expect(
      approveRequest("r1", { vehicleId: "v1", driverId: null }, baseAdminActor),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(prisma.caution.create).not.toHaveBeenCalled();
  });

  it("pedido sem condutor: aprova só com o veículo e o solicitante fica responsável", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      withDriver: false,
      origin: null,
      passengerCount: null,
      user: baseUser,
    });
    const result = await approveRequest("r1", { vehicleId: "v1" }, baseAdminActor);

    expect(result.driver).toBeNull();
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.caution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ driverId: null, userId: "u1" }),
      }),
    );
    expect(createNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "TRIP_ASSIGNED" }),
    );
  });

  it("pedido sem condutor: a central ainda pode escalar um condutor", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      withDriver: false,
      user: baseUser,
    });
    const result = await approveRequest("r1", approveInput, baseAdminActor);
    expect(result.driver?.id).toBe("d1");
  });

  it("rejeita condutor com perfil de administrador", async () => {
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseDriver,
      role: "ADMIN",
    });
    await expect(approveRequest("r1", approveInput, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejeita usuário que não é condutor", async () => {
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseDriver,
      isDriver: false,
    });
    await expect(approveRequest("r1", approveInput, baseAdminActor)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(prisma.caution.create).not.toHaveBeenCalled();
  });

  it("rejeita condutor bloqueado", async () => {
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseDriver,
      status: "BLOCKED",
    });
    await expect(approveRequest("r1", approveInput, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejeita condutor com CNH vencendo antes do fim da viagem", async () => {
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseDriver,
      driverLicenseExpiresAt: new Date("2026-06-14T00:00:00.000Z"),
    });
    await expect(approveRequest("r1", approveInput, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("aceita CNH que vence no último dia da viagem", async () => {
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseDriver,
      driverLicenseExpiresAt: new Date("2026-06-15T00:00:00.000Z"),
    });
    const result = await approveRequest("r1", approveInput, baseAdminActor);
    expect(result.caution.publicCode).toMatch(/^CTL-/);
  });

  it("rejeita condutor já escalado no mesmo período", async () => {
    (prisma.caution.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([]) // veículo livre
      .mockResolvedValueOnce([
        {
          publicCode: "CTL-DO-CONDUTOR",
          plannedWithdrawalAt: new Date("2026-06-15T10:00:00.000Z"),
          plannedReturnAt: new Date("2026-06-15T15:00:00.000Z"),
        },
      ]);
    await expect(approveRequest("r1", approveInput, baseAdminActor)).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("CTL-DO-CONDUTOR"),
    });
    expect(prisma.caution.create).not.toHaveBeenCalled();
  });
});

describe("rejectRequest", () => {
  it("registra motivo, audita, notifica e envia e-mail", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      user: baseUser,
    });
    (prisma.vehicleRequest.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
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

describe("decisões simultâneas", () => {
  beforeEach(() => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      user: baseUser,
    });
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseDriver);
    (prisma.caution.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.caution.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      publicCode: "CTL-2026-06-15-BBBBBBBB",
      status: "AGUARDANDO_RETIRADA",
    });
    (prisma.vehicleRequest.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      status: "APROVADA",
    });
  });

  it("aprovação só grava se o pedido ainda estiver em análise", async () => {
    await approveRequest("r1", { vehicleId: "v1", driverId: "d1" }, baseAdminActor);
    expect(
      (prisma.vehicleRequest.updateMany as ReturnType<typeof vi.fn>).mock.calls[0]![0],
    ).toMatchObject({ where: { id: "r1", status: "PENDENTE_ANALISE" } });
  });

  it("segundo clique em aprovar recebe conflito e não cria outra viagem", async () => {
    (prisma.vehicleRequest.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    await expect(
      approveRequest("r1", { vehicleId: "v1", driverId: "d1" }, baseAdminActor),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(prisma.caution.create).not.toHaveBeenCalled();
  });

  it("trava veículo e condutor antes de rechecar a agenda", async () => {
    await approveRequest("r1", { vehicleId: "v1", driverId: "d1" }, baseAdminActor);
    const locks = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[1]);
    expect(locks).toEqual([`person:${baseDriver.id}`, `vehicle:${baseVehicle.id}`]);
  });

  it("viagem gravada por outra aprovação no meio do caminho bloqueia esta", async () => {
    // Fora da transação o veículo parecia livre; dentro dela, já não está.
    (prisma.caution.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          plannedWithdrawalAt: new Date("2026-06-15T07:00:00Z"),
          plannedReturnAt: new Date("2026-06-15T18:00:00Z"),
          publicCode: "CTL-CONCORRENTE",
        },
      ]);
    await expect(
      approveRequest("r1", { vehicleId: "v1", driverId: "d1" }, baseAdminActor),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("CTL-CONCORRENTE"),
    });
    expect(prisma.caution.create).not.toHaveBeenCalled();
  });

  it("cancelar e recusar não sobrescrevem uma decisão já tomada", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseRequest);
    (prisma.vehicleRequest.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    await expect(cancelMyRequest("r1", {}, baseActor)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      rejectRequest("r1", { rejectionReason: "Sem veículo" }, baseAdminActor),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("aprovação repetida do mesmo pedido", () => {
  it("se a viagem que ocupa o período é deste pedido, avisa que ele já foi decidido", async () => {
    (prisma.vehicleRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseRequest,
      user: baseUser,
    });
    (prisma.vehicle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseVehicle);
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseDriver);
    (prisma.caution.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        plannedWithdrawalAt: new Date("2026-06-15T07:00:00Z"),
        plannedReturnAt: new Date("2026-06-15T18:00:00Z"),
        publicCode: "CTL-DESTE-PEDIDO",
        requestId: "r1",
      },
    ]);
    await expect(
      approveRequest("r1", { vehicleId: "v1", driverId: "d1" }, baseAdminActor),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Esta solicitação não está mais em análise.",
    });
  });
});
