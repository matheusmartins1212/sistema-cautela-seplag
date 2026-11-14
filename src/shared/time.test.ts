import { describe, it, expect } from "vitest";
import { formatInstantBr, formatIsoDateBr, formatWallClockBr, toAppWallClock } from "./time";

describe("toAppWallClock", () => {
  it("converte um instante real para a hora de parede de Cuiabá (UTC-4)", () => {
    expect(toAppWallClock(new Date("2026-11-13T22:46:00Z")).toISOString()).toBe(
      "2026-11-13T18:46:00.000Z",
    );
  });

  it("vira o dia corretamente perto da meia-noite", () => {
    expect(toAppWallClock(new Date("2026-11-14T02:30:00Z")).toISOString()).toBe(
      "2026-11-13T22:30:00.000Z",
    );
  });

  it("devolução às 16:00 em Cuiabá não fica atrasada para um prazo das 17:00", () => {
    const devolvidoEm = new Date("2026-11-13T20:00:00Z"); // 16:00 em Cuiabá
    const prazo = new Date("2026-11-13T17:00:00Z"); // "17:00" agendado
    expect(toAppWallClock(devolvidoEm) > prazo).toBe(false);
  });
});

describe("formatInstantBr", () => {
  it("exibe o instante no horário de Cuiabá", () => {
    expect(formatInstantBr("2026-11-13T22:46:00Z")).toBe("13/11/2026 18:46");
  });
});

describe("formatWallClockBr", () => {
  it("exibe o horário agendado sem converter fuso", () => {
    expect(formatWallClockBr("2026-11-13T08:05:00Z")).toBe("13/11/2026 08:05");
  });
});

describe("formatIsoDateBr", () => {
  it("converte data ISO para o formato brasileiro", () => {
    expect(formatIsoDateBr("2026-11-13")).toBe("13/11/2026");
    expect(formatIsoDateBr(null)).toBe("");
  });
});
