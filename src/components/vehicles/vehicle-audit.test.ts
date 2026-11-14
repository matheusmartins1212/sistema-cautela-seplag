import { describe, it, expect } from "vitest";
import { describeVehicleAudit, formatVehicleFieldValue } from "./vehicle-audit";

describe("describeVehicleAudit", () => {
  it("traduz o cadastro com placa formatada e rótulos", () => {
    const view = describeVehicleAudit("VEHICLE_CREATED", {
      plate: "QBF3G44",
      category: "PICKUP",
      usageType: "OPERACIONAL",
    });
    expect(view.title).toBe("Veículo cadastrado");
    expect(view.details).toEqual(["Placa QBF-3G44", "Pick-up · Operacional"]);
  });

  it("lista as alterações campo a campo", () => {
    const view = describeVehicleAudit("VEHICLE_UPDATED", {
      changes: {
        currentMileage: { from: 12000, to: 12500 },
        linkedSector: { from: null, to: "SATGF" },
        notes: { from: "a", to: "b" },
      },
    });
    expect(view.details).toEqual([
      "Quilometragem: 12.000 km → 12.500 km",
      "Setor vinculado: (vazio) → SATGF",
      "Observações administrativas atualizadas",
    ]);
  });

  it("mostra status e motivo no bloqueio", () => {
    const view = describeVehicleAudit("VEHICLE_BLOCKED", {
      from: "DISPONIVEL",
      to: "BLOQUEADO",
      reason: "Pneu furado",
    });
    expect(view.title).toBe("Veículo bloqueado");
    expect(view.details).toEqual(["Status: Disponível → Bloqueado", "Motivo: Pneu furado"]);
  });

  it("não expõe o código interno de ações desconhecidas", () => {
    const view = describeVehicleAudit("SOMETHING_NEW", { foo: 1 });
    expect(view.title).toBe("Registro do sistema");
    expect(view.details).toEqual([]);
  });

  it("tolera metadata ausente ou malformada", () => {
    expect(describeVehicleAudit("VEHICLE_UPDATED", null).details).toEqual([
      "Nenhum campo foi alterado.",
    ]);
    expect(describeVehicleAudit("VEHICLE_STATUS_CHANGED", "x").details).toEqual([
      "(vazio) → (vazio)",
    ]);
  });
});

describe("formatVehicleFieldValue", () => {
  it("formata booleanos", () => {
    expect(formatVehicleFieldValue("active", false)).toBe("Não");
  });
});
