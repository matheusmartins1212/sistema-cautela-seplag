import { describe, expect, it } from "vitest";
import {
  countLabel,
  formatDateTimeParts,
  formatInstantDateTime,
  formatKm,
  formatPeriod,
  formatWallClockDateTime,
  formatWallClockPeriod,
  shortCode,
} from "./format";

describe("formatação das listas", () => {
  it("conta no singular e no plural", () => {
    expect(countLabel(1, "viagem", "viagens")).toBe("1 viagem");
    expect(countLabel(0, "viagem", "viagens")).toBe("0 viagens");
  });

  it("período numa linha", () => {
    expect(formatPeriod("2026-11-18", "13:00", "2026-11-18", "17:30")).toBe(
      "18/11/2026, 13:00–17:30",
    );
    expect(formatPeriod("2026-11-15", "07:30", "2026-11-16", "18:00")).toBe(
      "15/11/2026 07:30 – 16/11 18:00",
    );
    expect(formatPeriod("2026-12-31", "08:00", "2027-01-02", "18:00")).toBe(
      "31/12/2026 08:00 – 02/01/2027 18:00",
    );
  });

  it("omite o ano corrente", () => {
    expect(formatPeriod("2026-11-18", "13:00", "2026-11-18", "17:30", 2026)).toBe(
      "18/11, 13:00–17:30",
    );
    expect(formatPeriod("2025-11-18", "13:00", "2025-11-19", "17:30", 2026)).toBe(
      "18/11/2025 13:00 – 19/11 17:30",
    );
  });

  it("código curto", () => {
    expect(shortCode("SOL-2026-11-13-ZTRN2P9D")).toBe("ZTRN2P9D");
  });

  it("período de instantes de relógio de Cuiabá", () => {
    expect(formatWallClockPeriod("2026-11-23T16:00:00.000Z", "2026-11-23T18:00:00.000Z")).toBe(
      "23/11/2026, 16:00–18:00",
    );
  });
});

describe("formatação das telas de detalhe", () => {
  it("data e hora com 'às', sem o ano corrente", () => {
    expect(formatDateTimeParts("2026-12-02", "09:00", 2026)).toBe("02/12 às 09:00");
    expect(formatDateTimeParts("2027-01-05", "07:30", 2026)).toBe("05/01/2027 às 07:30");
    expect(formatDateTimeParts("2026-12-02", "09:00")).toBe("02/12/2026 às 09:00");
  });

  it("horário agendado é lido como relógio de Cuiabá", () => {
    expect(formatWallClockDateTime("2026-12-02T09:00:00.000Z", 2026)).toBe("02/12 às 09:00");
  });

  it("instante real é convertido para Cuiabá (UTC-4)", () => {
    expect(formatInstantDateTime("2026-11-25T14:00:00.000Z", 2026)).toBe("25/11 às 10:00");
    expect(formatInstantDateTime("2027-01-01T02:00:00.000Z", 2026)).toBe("31/12 às 22:00");
  });

  it("quilometragem com milhar", () => {
    expect(formatKm(60085)).toBe("60.085 km");
    expect(formatKm(0)).toBe("0 km");
  });
});
