import { describe, it, expect } from "vitest";
import { generateRequestCode, generateCautionCode, isValidPublicCode } from "./public-code";

describe("geração de código público", () => {
  const fixedDate = new Date(2026, 5, 9); // 2026-06-09 (mês 0-based)

  it("gera código de solicitação no formato esperado", () => {
    const code = generateRequestCode(fixedDate);
    expect(code).toMatch(/^SOL-2026-06-09-[A-Z2-9]{8}$/);
    expect(isValidPublicCode(code)).toBe(true);
  });

  it("gera código de cautela no formato esperado", () => {
    const code = generateCautionCode(fixedDate);
    expect(code).toMatch(/^CTL-2026-06-09-[A-Z2-9]{8}$/);
    expect(isValidPublicCode(code)).toBe(true);
  });

  it("não usa caracteres ambíguos no sufixo", () => {
    const suffix = generateRequestCode(fixedDate).split("-").pop()!;
    expect(suffix).not.toMatch(/[01OIL]/);
  });

  it("gera códigos distintos (sufixo aleatório)", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateRequestCode(fixedDate)));
    // Colisões devem ser raríssimas; 200 amostras devem ser únicas.
    expect(codes.size).toBe(200);
  });

  it("rejeita código com formato inválido", () => {
    expect(isValidPublicCode("SOL-2026-6-9-ABCD")).toBe(false);
    expect(isValidPublicCode("XXX-2026-06-09-ABCDEFGH")).toBe(false);
  });
});
