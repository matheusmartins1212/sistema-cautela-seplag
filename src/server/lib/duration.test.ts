import { describe, it, expect } from "vitest";
import { parseDurationToMs, expiresAt } from "./duration";

describe("parseDurationToMs", () => {
  it("converte unidades", () => {
    expect(parseDurationToMs("45s")).toBe(45_000);
    expect(parseDurationToMs("30m")).toBe(1_800_000);
    expect(parseDurationToMs("24h")).toBe(86_400_000);
    expect(parseDurationToMs("7d")).toBe(604_800_000);
  });

  it("aceita espaços e maiúsculas", () => {
    expect(parseDurationToMs("2 H")).toBe(7_200_000);
  });

  it("lança em formato inválido", () => {
    expect(() => parseDurationToMs("abc")).toThrow();
    expect(() => parseDurationToMs("10")).toThrow();
  });
});

describe("expiresAt", () => {
  it("soma a duração à data base", () => {
    const base = new Date("2026-06-09T00:00:00.000Z");
    expect(expiresAt("30m", base).toISOString()).toBe("2026-06-09T00:30:00.000Z");
  });
});
