import { describe, it, expect } from "vitest";
import {
  changeStatusSchema,
  createVehicleSchema,
  isAdminControlledTarget,
  isWorkflowStatus,
  listVehiclesQuerySchema,
  updateVehicleSchema,
} from "./vehicle.schemas";

describe("createVehicleSchema", () => {
  const baseInput = {
    brand: "Mitsubishi",
    model: "L200",
    plate: "rrz-5i91",
    category: "PICKUP",
    usageType: "ADMINISTRATIVO",
  };

  it("normaliza a placa para uppercase sem hífen/espaço", () => {
    const parsed = createVehicleSchema.parse(baseInput);
    expect(parsed.plate).toBe("RRZ5I91");
  });

  it("aplica default 0 em currentMileage", () => {
    const parsed = createVehicleSchema.parse(baseInput);
    expect(parsed.currentMileage).toBe(0);
  });

  it("converte strings vazias em null para campos opcionais", () => {
    const parsed = createVehicleSchema.parse({
      ...baseInput,
      linkedSector: "",
      agency: "",
      notes: "",
    });
    expect(parsed.linkedSector).toBeNull();
    expect(parsed.agency).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("rejeita placa inválida", () => {
    const result = createVehicleSchema.safeParse({
      ...baseInput,
      plate: "INVALIDO",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita category fora do enum", () => {
    const result = createVehicleSchema.safeParse({
      ...baseInput,
      category: "VAN",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quilometragem negativa", () => {
    const result = createVehicleSchema.safeParse({
      ...baseInput,
      currentMileage: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateVehicleSchema", () => {
  it("aceita atualização parcial", () => {
    const result = updateVehicleSchema.parse({ currentMileage: 12345 });
    expect(result.currentMileage).toBe(12345);
  });

  it("aceita active boolean", () => {
    const result = updateVehicleSchema.parse({ active: false });
    expect(result.active).toBe(false);
  });
});

describe("listVehiclesQuerySchema", () => {
  it("aplica defaults de paginação", () => {
    const parsed = listVehiclesQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  it("coage strings em números (querystring)", () => {
    const parsed = listVehiclesQuerySchema.parse({ page: "3", pageSize: "50" });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(50);
  });

  it("aceita active como string 'true'/'false'", () => {
    expect(listVehiclesQuerySchema.parse({ active: "true" }).active).toBe(true);
    expect(listVehiclesQuerySchema.parse({ active: "false" }).active).toBe(false);
  });

  it("limita pageSize a 100", () => {
    const result = listVehiclesQuerySchema.safeParse({ pageSize: 999 });
    expect(result.success).toBe(false);
  });
});

describe("changeStatusSchema", () => {
  it("aceita targets administrativos", () => {
    for (const target of ["DISPONIVEL", "BLOQUEADO", "EM_MANUTENCAO", "BAIXADO", "INATIVO"]) {
      const r = changeStatusSchema.safeParse({ targetStatus: target, reason: "Motivo X" });
      expect(r.success).toBe(true);
    }
  });

  it("rejeita targets de fluxo (controlados pelo ciclo de cautela)", () => {
    for (const target of [
      "RESERVADO",
      "EM_USO",
      "AGUARDANDO_RETIRADA",
      "AGUARDANDO_DEVOLUCAO",
      "DEVOLVIDO",
      "EM_ANALISE",
    ]) {
      const r = changeStatusSchema.safeParse({ targetStatus: target, reason: "x" });
      expect(r.success).toBe(false);
    }
  });

  it("exige motivo não vazio", () => {
    const r = changeStatusSchema.safeParse({ targetStatus: "BLOQUEADO", reason: "" });
    expect(r.success).toBe(false);
  });
});

describe("helpers de status", () => {
  it("isWorkflowStatus identifica estados de ciclo", () => {
    expect(isWorkflowStatus("EM_USO")).toBe(true);
    expect(isWorkflowStatus("RESERVADO")).toBe(true);
    expect(isWorkflowStatus("DISPONIVEL")).toBe(false);
    expect(isWorkflowStatus("BLOQUEADO")).toBe(false);
  });

  it("isAdminControlledTarget identifica estados administrativos", () => {
    expect(isAdminControlledTarget("DISPONIVEL")).toBe(true);
    expect(isAdminControlledTarget("BLOQUEADO")).toBe(true);
    expect(isAdminControlledTarget("EM_USO")).toBe(false);
  });
});
