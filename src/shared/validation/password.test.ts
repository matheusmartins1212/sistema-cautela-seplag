import { describe, it, expect } from "vitest";
import { checkPasswordStrength, isStrongPassword } from "./password";

describe("checkPasswordStrength", () => {
  it("aceita senha forte", () => {
    expect(isStrongPassword("Sutran@2026!")).toBe(true);
  });

  it("rejeita senha curta", () => {
    const r = checkPasswordStrength("Aa1@b");
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("caracteres"))).toBe(true);
  });

  it("exige maiúscula, minúscula, número e símbolo", () => {
    expect(isStrongPassword("alllowercase1")).toBe(false); // sem maiúscula/símbolo
    expect(isStrongPassword("ALLUPPER123!")).toBe(false); // sem minúscula
    expect(isStrongPassword("NoNumbers!!")).toBe(false); // sem número
    expect(isStrongPassword("NoSymbol123")).toBe(false); // sem símbolo
  });

  it("rejeita senha comum mesmo que longa", () => {
    expect(isStrongPassword("administrador")).toBe(false);
  });
});
