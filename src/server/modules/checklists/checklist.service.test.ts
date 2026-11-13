import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    checklist: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    checklistItem: {
      updateMany: vi.fn(),
    },
    checklistPhoto: {
      findMany: vi.fn(),
    },
    checklistItemTemplate: {
      findMany: vi.fn(),
    },
    caution: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
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

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/lib/audit";
import {
  getOrInitChecklistForCaution,
  reviewChecklist,
  submitChecklist,
} from "./checklist.service";

const baseActor = {
  user: {
    id: "u1",
    role: "USER" as const,
    fullName: "João",
    email: "j@seplag.mt.gov.br",
    cpf: "0",
    registrationNumber: "1",
    phone: "",
    sector: "",
    department: "",
    status: "ACTIVE" as const,
    passwordHash: "h",
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  session: { id: "s", expiresAt: new Date() },
};

const adminActor = {
  ...baseActor,
  user: { ...baseActor.user, id: "admin1", role: "ADMIN" as const },
};

const baseCaution = {
  id: "c1",
  userId: "u1",
  vehicleId: "v1",
  status: "AGUARDANDO_RETIRADA" as const,
  vehicle: {
    id: "v1",
    category: "PICKUP" as const,
    currentStatus: "RESERVADO" as const,
  },
};

const baseChecklist = {
  id: "cl1",
  cautionId: "c1",
  vehicleId: "v1",
  userId: "u1",
  type: "RETIRADA" as const,
  status: "EM_PREENCHIMENTO" as const,
  items: [
    { id: "i1", itemKey: "para_brisas", itemLabel: "Para-brisas" },
    { id: "i2", itemKey: "farois_dianteiros", itemLabel: "Faróis dianteiros" },
  ],
  caution: {
    id: "c1",
    vehicleId: "v1",
    status: "AGUARDANDO_RETIRADA" as const,
    vehicle: { id: "v1", currentStatus: "RESERVADO" as const },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  // Sem fotos por padrão; testes específicos sobrescrevem.
  (prisma.checklistPhoto.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  // Sem outras cautelas do mesmo veículo por padrão.
  (prisma.caution.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (prisma.caution.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

const submitInput = {
  realDate: "2026-06-20",
  realTime: "12:00",
  mileage: 12500,
  fuelLevel: "MEIO" as const,
  fuelCardStatus: "PRESENTE" as const,
  internalCleanliness: "REGULAR" as const,
  externalCleanliness: "REGULAR" as const,
  parkingLocation: "Pátio Central",
  hasChangesFromInitial: false,
  changesDescription: null,
  hasDamage: false,
  damageDescription: null,
  generalNotes: null,
  items: [
    { itemKey: "para_brisas", answer: "BOM" as const, observation: null },
    { itemKey: "farois_dianteiros", answer: "BOM" as const, observation: null },
  ],
};

describe("getOrInitChecklistForCaution", () => {
  it("rejeita usuário comum tentando acessar cautela de outro (404)", async () => {
    (prisma.caution.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseCaution,
      userId: "outro",
    });
    await expect(getOrInitChecklistForCaution("c1", "RETIRADA", baseActor)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejeita devolução antes do veículo estar em uso", async () => {
    (prisma.caution.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseCaution);
    await expect(getOrInitChecklistForCaution("c1", "DEVOLUCAO", baseActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("cria checklist a partir do template aplicável (PICKUP+geral)", async () => {
    (prisma.caution.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseCaution);
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.checklistItemTemplate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { itemKey: "para_brisas", label: "Para-brisas", category: null, requiresPhotoOnIssue: true },
      {
        itemKey: "capota_maritima",
        label: "Capota marítima",
        category: "PICKUP",
        requiresPhotoOnIssue: true,
      },
    ]);
    (prisma.checklist.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseChecklist,
      status: "PENDENTE",
    });

    await getOrInitChecklistForCaution("c1", "RETIRADA", baseActor);
    expect(prisma.checklistItemTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ category: null }, { category: "PICKUP" }],
        }),
      }),
    );
  });
});

describe("submitChecklist (RETIRADA)", () => {
  it("transição atômica: caution→EM_USO e vehicle→EM_USO; auditoria CHECKLIST_SUBMITTED", async () => {
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(baseChecklist) // findUnique inicial (com caution)
      .mockResolvedValueOnce({ ...baseChecklist, status: "ENVIADO" }); // getChecklistById ao final
    (prisma.checklist.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseChecklist,
      status: "ENVIADO",
    });

    await submitChecklist(
      "cl1",
      {
        realDate: "2026-06-20",
        realTime: "08:00",
        mileage: 12345,
        fuelLevel: "TRES_QUARTOS",
        fuelCardStatus: "PRESENTE",
        internalCleanliness: "LIMPO",
        externalCleanliness: "LIMPO",
        parkingLocation: null,
        hasChangesFromInitial: false,
        changesDescription: null,
        hasDamage: false,
        damageDescription: null,
        generalNotes: null,
        items: [
          { itemKey: "para_brisas", answer: "BOM", observation: null },
          { itemKey: "farois_dianteiros", answer: "BOM", observation: null },
        ],
      },
      baseActor,
    );

    expect(prisma.caution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "EM_USO" }),
      }),
    );
    expect(prisma.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStatus: "EM_USO",
          currentMileage: 12345,
        }),
      }),
    );
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHECKLIST_SUBMITTED" }),
    );
  });

  const fullSubmit = (overrides: Record<string, unknown>) => ({
    realDate: "2026-06-20",
    realTime: "08:00",
    mileage: 100,
    fuelLevel: "CHEIO" as const,
    fuelCardStatus: "PRESENTE" as const,
    internalCleanliness: "LIMPO" as const,
    externalCleanliness: "LIMPO" as const,
    parkingLocation: null,
    hasChangesFromInitial: false,
    changesDescription: null,
    hasDamage: false,
    damageDescription: null,
    generalNotes: null,
    items: [
      { itemKey: "para_brisas", answer: "BOM" as const, observation: null },
      { itemKey: "farois_dianteiros", answer: "BOM" as const, observation: null },
    ],
    ...overrides,
  });

  it("rejeita envio com item RUIM/AUSENTE sem foto", async () => {
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseChecklist);
    (prisma.checklistPhoto.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(
      submitChecklist(
        "cl1",
        fullSubmit({
          items: [
            { itemKey: "para_brisas", answer: "RUIM", observation: "trincado" },
            { itemKey: "farois_dianteiros", answer: "BOM", observation: null },
          ],
        }),
        baseActor,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("aceita item RUIM quando há foto vinculada", async () => {
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(baseChecklist)
      .mockResolvedValueOnce({ ...baseChecklist, status: "ENVIADO" });
    (prisma.checklist.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseChecklist,
      status: "ENVIADO",
    });
    (prisma.checklistPhoto.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { checklistItemId: "i1", type: "ITEM" },
    ]);

    await submitChecklist(
      "cl1",
      fullSubmit({
        items: [
          { itemKey: "para_brisas", answer: "RUIM", observation: "trincado" },
          { itemKey: "farois_dianteiros", answer: "BOM", observation: null },
        ],
      }),
      baseActor,
    );

    expect(prisma.caution.update).toHaveBeenCalled();
  });

  it("rejeita envio com avaria sem foto", async () => {
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseChecklist);
    (prisma.checklistPhoto.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(
      submitChecklist(
        "cl1",
        fullSubmit({ hasDamage: true, damageDescription: "amassado na porta" }),
        baseActor,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejeita envio com item faltando", async () => {
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseChecklist);

    await expect(
      submitChecklist(
        "cl1",
        {
          realDate: "2026-06-20",
          realTime: "08:00",
          mileage: 1,
          fuelLevel: "CHEIO",
          fuelCardStatus: "PRESENTE",
          internalCleanliness: "LIMPO",
          externalCleanliness: "LIMPO",
          parkingLocation: null,
          hasChangesFromInitial: false,
          changesDescription: null,
          hasDamage: false,
          damageDescription: null,
          generalNotes: null,
          // Falta "farois_dianteiros"
          items: [{ itemKey: "para_brisas", answer: "BOM", observation: null }],
        },
        baseActor,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejeita usuário diferente do dono", async () => {
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseChecklist,
      userId: "outro",
    });
    await expect(
      submitChecklist(
        "cl1",
        {
          realDate: "2026-06-20",
          realTime: "08:00",
          mileage: 1,
          fuelLevel: "CHEIO",
          fuelCardStatus: "PRESENTE",
          internalCleanliness: "LIMPO",
          externalCleanliness: "LIMPO",
          parkingLocation: null,
          hasChangesFromInitial: false,
          changesDescription: null,
          hasDamage: false,
          damageDescription: null,
          generalNotes: null,
          items: [
            { itemKey: "para_brisas", answer: "BOM", observation: null },
            { itemKey: "farois_dianteiros", answer: "BOM", observation: null },
          ],
        },
        baseActor,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("submitChecklist (DEVOLUCAO)", () => {
  it("transiciona caution→DEVOLUCAO_EM_ANALISE e vehicle→AGUARDANDO_DEVOLUCAO", async () => {
    const devolucaoChecklist = {
      ...baseChecklist,
      type: "DEVOLUCAO" as const,
      caution: {
        ...baseChecklist.caution,
        status: "EM_USO" as const,
        vehicle: { id: "v1", currentStatus: "EM_USO" as const },
      },
    };
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(devolucaoChecklist)
      .mockResolvedValueOnce({ ...devolucaoChecklist, status: "ENVIADO" });
    (prisma.checklist.update as ReturnType<typeof vi.fn>).mockResolvedValue(devolucaoChecklist);

    await submitChecklist(
      "cl1",
      {
        realDate: "2026-06-20",
        realTime: "12:00",
        mileage: 12500,
        fuelLevel: "MEIO",
        fuelCardStatus: "PRESENTE",
        internalCleanliness: "REGULAR",
        externalCleanliness: "REGULAR",
        parkingLocation: "Pátio Central",
        hasChangesFromInitial: false,
        changesDescription: null,
        hasDamage: false,
        damageDescription: null,
        generalNotes: null,
        items: [
          { itemKey: "para_brisas", answer: "BOM", observation: null },
          { itemKey: "farois_dianteiros", answer: "BOM", observation: null },
        ],
      },
      baseActor,
    );

    expect(prisma.caution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DEVOLUCAO_EM_ANALISE" }),
      }),
    );
    expect(prisma.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStatus: "AGUARDANDO_DEVOLUCAO",
        }),
      }),
    );
  });
});

describe("reviewChecklist", () => {
  it("aprovação de DEVOLUCAO finaliza cautela e libera veículo", async () => {
    const devolucao = {
      ...baseChecklist,
      type: "DEVOLUCAO" as const,
      status: "ENVIADO" as const,
      caution: {
        ...baseChecklist.caution,
        status: "DEVOLUCAO_EM_ANALISE" as const,
      },
    };
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(devolucao)
      .mockResolvedValueOnce({ ...devolucao, status: "APROVADO" });
    (prisma.checklist.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...devolucao,
      status: "APROVADO",
    });

    await reviewChecklist("cl1", { decision: "APPROVE" }, adminActor);

    expect(prisma.caution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FINALIZADA" }),
      }),
    );
    expect(prisma.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentStatus: "DISPONIVEL" }),
      }),
    );
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHECKLIST_REVIEWED" }),
    );
  });

  it("retificação NÃO altera caution/vehicle e registra CHECKLIST_RECTIFIED", async () => {
    const devolucao = {
      ...baseChecklist,
      type: "DEVOLUCAO" as const,
      status: "ENVIADO" as const,
      caution: {
        ...baseChecklist.caution,
        status: "DEVOLUCAO_EM_ANALISE" as const,
      },
    };
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(devolucao)
      .mockResolvedValueOnce({ ...devolucao, status: "RETIFICADO" });
    (prisma.checklist.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...devolucao,
      status: "RETIFICADO",
    });

    await reviewChecklist(
      "cl1",
      { decision: "REQUEST_RECTIFICATION", reviewNotes: "ajustar KM" },
      adminActor,
    );

    expect(prisma.caution.update).not.toHaveBeenCalled();
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHECKLIST_RECTIFIED" }),
    );
  });

  it("rejeita revisão de checklist que não está ENVIADO", async () => {
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseChecklist,
      status: "APROVADO",
      caution: { ...baseChecklist.caution, status: "FINALIZADA" },
    });
    await expect(reviewChecklist("cl1", { decision: "APPROVE" }, adminActor)).rejects.toMatchObject(
      { code: "CONFLICT" },
    );
  });
});

describe("correções de fluxo", () => {
  it("cautela ATRASADA ainda aceita o envio da devolução", async () => {
    const atrasada = {
      ...baseChecklist,
      type: "DEVOLUCAO" as const,
      caution: {
        ...baseChecklist.caution,
        status: "ATRASADA" as const,
        vehicle: { id: "v1", currentStatus: "EM_USO" as const },
      },
    };
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(atrasada)
      .mockResolvedValueOnce({ ...atrasada, status: "ENVIADO" });
    (prisma.checklist.update as ReturnType<typeof vi.fn>).mockResolvedValue(atrasada);

    await submitChecklist("cl1", submitInput, baseActor);

    expect(prisma.caution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DEVOLUCAO_EM_ANALISE" }),
      }),
    );
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CHECKLIST_SUBMITTED",
        metadata: expect.objectContaining({ returnedLate: true }),
      }),
    );
  });

  it("checklist em retificação pode ser corrigido e reenviado pelo dono", async () => {
    const retificado = {
      ...baseChecklist,
      type: "DEVOLUCAO" as const,
      status: "RETIFICADO" as const,
      caution: {
        ...baseChecklist.caution,
        status: "DEVOLUCAO_EM_ANALISE" as const,
        vehicle: { id: "v1", currentStatus: "AGUARDANDO_DEVOLUCAO" as const },
      },
    };
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(retificado)
      .mockResolvedValueOnce({ ...retificado, status: "ENVIADO" });
    (prisma.checklist.update as ReturnType<typeof vi.fn>).mockResolvedValue(retificado);

    await submitChecklist("cl1", submitInput, baseActor);

    expect(prisma.checklist.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ENVIADO" }) }),
    );
    // Cautela já estava em análise: reenvio não muda o status dela.
    expect(prisma.caution.update).not.toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ resubmission: true }) }),
    );
  });

  it("bloqueia a retirada enquanto o veículo está fora com outra cautela", async () => {
    (prisma.caution.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseCaution);
    (prisma.caution.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      publicCode: "CTL-ANTERIOR",
    });

    await expect(getOrInitChecklistForCaution("c1", "RETIRADA", baseActor)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("devolução atrasada é finalizada com observação e o carro volta a reservado se há outra reserva", async () => {
    const devolucao = {
      ...baseChecklist,
      type: "DEVOLUCAO" as const,
      status: "ENVIADO" as const,
      hasDamage: false,
      caution: {
        ...baseChecklist.caution,
        status: "DEVOLUCAO_EM_ANALISE" as const,
        plannedReturnAt: new Date("2026-06-20T12:00:00Z"),
        actualReturnAt: new Date("2026-06-21T09:00:00Z"),
        vehicle: { id: "v1", currentStatus: "AGUARDANDO_DEVOLUCAO" as const },
      },
    };
    (prisma.checklist.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(devolucao)
      .mockResolvedValueOnce({ ...devolucao, status: "APROVADO" });
    (prisma.checklist.update as ReturnType<typeof vi.fn>).mockResolvedValue(devolucao);
    (prisma.caution.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "AGUARDANDO_RETIRADA" },
    ]);

    await reviewChecklist("cl1", { decision: "APPROVE" }, adminActor);

    expect(prisma.caution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FINALIZADA_COM_OBSERVACAO" }),
      }),
    );
    expect(prisma.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { currentStatus: "RESERVADO" } }),
    );
  });
});
