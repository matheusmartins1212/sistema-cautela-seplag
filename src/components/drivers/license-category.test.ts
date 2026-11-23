import { describe, expect, it } from "vitest";
import { joinLicenseCategory, splitLicenseCategory } from "./license-category";

describe("categoria da CNH", () => {
  it("separa a categoria de veículo da moto", () => {
    expect(splitLicenseCategory("AD")).toEqual({ main: "D", moto: true });
    expect(splitLicenseCategory("B")).toEqual({ main: "B", moto: false });
    expect(splitLicenseCategory(null)).toEqual({ main: "", moto: false });
  });

  it("monta o valor da CNH impressa", () => {
    expect(joinLicenseCategory("E", true)).toBe("AE");
    expect(joinLicenseCategory("C", false)).toBe("C");
    expect(joinLicenseCategory("", true)).toBe("");
  });
});
