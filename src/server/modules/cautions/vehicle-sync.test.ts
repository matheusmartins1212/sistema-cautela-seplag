import { describe, it, expect } from "vitest";
import { vehicleStatusForActiveCautions } from "./vehicle-sync";

describe("vehicleStatusForActiveCautions", () => {
  it("sem cautelas ativas o carro fica disponível", () => {
    expect(vehicleStatusForActiveCautions([])).toBe("DISPONIVEL");
  });

  it("reserva futura deixa o carro reservado", () => {
    expect(vehicleStatusForActiveCautions(["AGUARDANDO_RETIRADA"])).toBe("RESERVADO");
  });

  it("carro fora (em uso ou atrasado) prevalece sobre reserva", () => {
    expect(vehicleStatusForActiveCautions(["AGUARDANDO_RETIRADA", "ATRASADA"])).toBe("EM_USO");
  });

  it("devolução em conferência prevalece sobre reserva", () => {
    expect(vehicleStatusForActiveCautions(["DEVOLUCAO_EM_ANALISE", "AGUARDANDO_RETIRADA"])).toBe(
      "AGUARDANDO_DEVOLUCAO",
    );
  });
});
