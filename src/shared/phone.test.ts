import { describe, it, expect } from "vitest";
import { formatPhoneBr } from "./phone";

describe("formatPhoneBr", () => {
  it("formata celular e fixo", () => {
    expect(formatPhoneBr("65999990001")).toBe("(65) 99999-0001");
    expect(formatPhoneBr("6533330001")).toBe("(65) 3333-0001");
  });
  it("devolve o valor original quando não reconhece", () => {
    expect(formatPhoneBr("123")).toBe("123");
    expect(formatPhoneBr(null)).toBe("");
  });
});
