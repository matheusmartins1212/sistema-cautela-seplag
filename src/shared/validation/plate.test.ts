import { describe, it, expect } from "vitest";
import { normalizePlate, isValidPlate, formatPlate } from "./plate";

describe("normalizePlate", () => {
  it("remove espaços, hífens e aplica uppercase", () => {
    expect(normalizePlate(" rrz-5i91 ")).toBe("RRZ5I91");
    expect(normalizePlate("spg 2f28")).toBe("SPG2F28");
    expect(normalizePlate("RRY-2B09")).toBe("RRY2B09");
  });
});

describe("isValidPlate", () => {
  it("aceita formato Mercosul (AAA9A99)", () => {
    expect(isValidPlate("RRZ5I91")).toBe(true);
    expect(isValidPlate("SPG2F28")).toBe(true);
    expect(isValidPlate("rry-2b09")).toBe(true);
  });

  it("aceita formato antigo (AAA9999)", () => {
    expect(isValidPlate("QBQ1417")).toBe(true);
    expect(isValidPlate("NIY-7058")).toBe(true);
  });

  it("rejeita placas inválidas", () => {
    expect(isValidPlate("")).toBe(false);
    expect(isValidPlate("ABC")).toBe(false);
    expect(isValidPlate("AAAA999")).toBe(false);
    expect(isValidPlate("AA12345")).toBe(false);
    expect(isValidPlate("123ABCD")).toBe(false);
    expect(isValidPlate("AAA9A9A")).toBe(false);
  });
});

describe("formatPlate", () => {
  it("formata com hífen quando válida", () => {
    expect(formatPlate("rrz5i91")).toBe("RRZ-5I91");
    expect(formatPlate("QBQ1417")).toBe("QBQ-1417");
  });

  it("retorna o valor original quando inválida", () => {
    expect(formatPlate("ABC")).toBe("ABC");
  });
});
