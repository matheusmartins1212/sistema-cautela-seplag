import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    checklist: { findMany: vi.fn() },
  };
  return { prisma };
});

import { prisma } from "@/server/db/prisma";
import { compareChecklistsOfCaution, hasNotableDivergence } from "./comparison.service";

function mkChecklist(
  type: "RETIRADA" | "DEVOLUCAO",
  overrides: {
    mileage?: number | null;
    fuelLevel?: string | null;
    hasDamage?: boolean | null;
    items?: Array<{ itemKey: string; itemLabel?: string; answer: string | null }>;
  } = {},
) {
  return {
    id: type,
    type,
    mileage: overrides.mileage ?? 1000,
    fuelLevel: overrides.fuelLevel ?? "CHEIO",
    hasDamage: overrides.hasDamage ?? false,
    items: (overrides.items ?? []).map((i, idx) => ({
      id: `${type}-${idx}`,
      checklistId: type,
      itemKey: i.itemKey,
      itemLabel: i.itemLabel ?? i.itemKey,
      answer: i.answer,
      observation: null,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("compareChecklistsOfCaution", () => {
  it("retorna flags vazias quando algum checklist falta", async () => {
    (prisma.checklist.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      mkChecklist("RETIRADA"),
    ]);
    const r = await compareChecklistsOfCaution("c1");
    expect(r.hasRetirada).toBe(true);
    expect(r.hasDevolucao).toBe(false);
    expect(r.itemsDeteriorated).toHaveLength(0);
  });

  it("detecta item que piorou (BOM → RUIM)", async () => {
    (prisma.checklist.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      mkChecklist("RETIRADA", {
        items: [
          { itemKey: "para_brisas", answer: "BOM" },
          { itemKey: "estepe", answer: "BOM" },
        ],
      }),
      mkChecklist("DEVOLUCAO", {
        items: [
          { itemKey: "para_brisas", answer: "RUIM" },
          { itemKey: "estepe", answer: "BOM" },
        ],
      }),
    ]);
    const r = await compareChecklistsOfCaution("c1");
    expect(r.itemsDeteriorated).toHaveLength(1);
    expect(r.itemsDeteriorated[0]?.itemKey).toBe("para_brisas");
  });

  it("detecta combustível abaixou", async () => {
    (prisma.checklist.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      mkChecklist("RETIRADA", { fuelLevel: "CHEIO", items: [] }),
      mkChecklist("DEVOLUCAO", { fuelLevel: "MEIO", items: [] }),
    ]);
    const r = await compareChecklistsOfCaution("c1");
    expect(r.fuelDeteriorated?.before).toBe("CHEIO");
    expect(r.fuelDeteriorated?.after).toBe("MEIO");
  });

  it("detecta quilometragem inconsistente (devolução < retirada)", async () => {
    (prisma.checklist.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      mkChecklist("RETIRADA", { mileage: 1000, items: [] }),
      mkChecklist("DEVOLUCAO", { mileage: 900, items: [] }),
    ]);
    const r = await compareChecklistsOfCaution("c1");
    expect(r.mileageInconsistent).toBe(true);
    expect(r.mileageDelta).toBe(-100);
  });

  it("calcula delta positivo de km", async () => {
    (prisma.checklist.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      mkChecklist("RETIRADA", { mileage: 1000, items: [] }),
      mkChecklist("DEVOLUCAO", { mileage: 1230, items: [] }),
    ]);
    const r = await compareChecklistsOfCaution("c1");
    expect(r.mileageInconsistent).toBe(false);
    expect(r.mileageDelta).toBe(230);
  });

  it("reporta avaria declarada na devolução", async () => {
    (prisma.checklist.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      mkChecklist("RETIRADA", { items: [] }),
      mkChecklist("DEVOLUCAO", { hasDamage: true, items: [] }),
    ]);
    const r = await compareChecklistsOfCaution("c1");
    expect(r.damageDeclaredOnReturn).toBe(true);
  });
});

describe("hasNotableDivergence", () => {
  it("é falso quando tudo igual", () => {
    expect(
      hasNotableDivergence({
        hasRetirada: true,
        hasDevolucao: true,
        itemsDeteriorated: [],
        fuelDeteriorated: null,
        mileageDelta: 100,
        mileageInconsistent: false,
        damageDeclaredOnReturn: false,
      }),
    ).toBe(false);
  });

  it("é true em qualquer divergência", () => {
    expect(
      hasNotableDivergence({
        hasRetirada: true,
        hasDevolucao: true,
        itemsDeteriorated: [],
        fuelDeteriorated: null,
        mileageDelta: 100,
        mileageInconsistent: false,
        damageDeclaredOnReturn: true,
      }),
    ).toBe(true);
  });
});
