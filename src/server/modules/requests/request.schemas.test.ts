import { describe, it, expect } from "vitest";
import {
  approveRequestSchema,
  cancelRequestSchema,
  createRequestSchema,
  listAdminRequestsQuerySchema,
  listMyRequestsQuerySchema,
  rejectRequestSchema,
} from "./request.schemas";

const baseInput = {
  withdrawalDate: "2026-06-15",
  returnDate: "2026-06-15",
  shift: "MATUTINO",
  withdrawalTime: "08:00",
  returnTime: "12:00",
  destination: "Rondonópolis - MT",
  reason: "Operação Energisa",
};

describe("createRequestSchema", () => {
  it("aceita uma solicitação coerente", () => {
    const r = createRequestSchema.safeParse(baseInput);
    expect(r.success).toBe(true);
  });

  it("converte termNumber vazio em null", () => {
    const r = createRequestSchema.parse({ ...baseInput, termNumber: "  " });
    expect(r.termNumber).toBeNull();
  });

  it("rejeita devolução antes da retirada", () => {
    const r = createRequestSchema.safeParse({
      ...baseInput,
      withdrawalDate: "2026-06-15",
      returnDate: "2026-06-14",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita devolução no mesmo dia anterior ou igual ao horário de retirada", () => {
    const r1 = createRequestSchema.safeParse({
      ...baseInput,
      withdrawalTime: "08:00",
      returnTime: "08:00",
    });
    expect(r1.success).toBe(false);
    const r2 = createRequestSchema.safeParse({
      ...baseInput,
      withdrawalTime: "10:00",
      returnTime: "08:00",
    });
    expect(r2.success).toBe(false);
  });

  it("aceita devolução em dia posterior mesmo com horário anterior", () => {
    const r = createRequestSchema.safeParse({
      ...baseInput,
      withdrawalDate: "2026-06-15",
      returnDate: "2026-06-16",
      withdrawalTime: "14:00",
      returnTime: "08:00",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita data no formato errado", () => {
    const r = createRequestSchema.safeParse({
      ...baseInput,
      withdrawalDate: "15/06/2026",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita horário fora do padrão HH:mm", () => {
    const r = createRequestSchema.safeParse({
      ...baseInput,
      withdrawalTime: "8:00",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita shift fora do enum", () => {
    const r = createRequestSchema.safeParse({ ...baseInput, shift: "NOTURNO" });
    expect(r.success).toBe(false);
  });

  it("rejeita destino vazio", () => {
    const r = createRequestSchema.safeParse({ ...baseInput, destination: " " });
    expect(r.success).toBe(false);
  });

  it("rejeita motivo vazio", () => {
    const r = createRequestSchema.safeParse({ ...baseInput, reason: "" });
    expect(r.success).toBe(false);
  });
});

describe("approveRequestSchema", () => {
  it("exige vehicleId", () => {
    expect(approveRequestSchema.safeParse({}).success).toBe(false);
    expect(approveRequestSchema.safeParse({ vehicleId: "v1" }).success).toBe(true);
  });
});

describe("rejectRequestSchema", () => {
  it("exige motivo de recusa não vazio", () => {
    expect(rejectRequestSchema.safeParse({ rejectionReason: "" }).success).toBe(false);
    expect(rejectRequestSchema.safeParse({ rejectionReason: "Sem motorista" }).success).toBe(true);
  });
});

describe("cancelRequestSchema", () => {
  it("aceita corpo vazio", () => {
    expect(cancelRequestSchema.safeParse({}).success).toBe(true);
  });
});

describe("listMyRequestsQuerySchema", () => {
  it("aplica defaults de paginação", () => {
    const r = listMyRequestsQuerySchema.parse({});
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
  });

  it("aceita múltiplos status separados por vírgula", () => {
    const r = listMyRequestsQuerySchema.parse({
      status: "PENDENTE_ANALISE,APROVADA",
    });
    expect(r.status).toEqual(["PENDENTE_ANALISE", "APROVADA"]);
  });
});

describe("listAdminRequestsQuerySchema", () => {
  it("aceita filtros por data", () => {
    const r = listAdminRequestsQuerySchema.parse({
      withdrawalDateFrom: "2026-06-01",
      withdrawalDateTo: "2026-06-30",
    });
    expect(r.withdrawalDateFrom).toBe("2026-06-01");
    expect(r.withdrawalDateTo).toBe("2026-06-30");
  });
});
