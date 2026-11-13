import { describe, it, expect } from "vitest";
import {
  reviewChecklistSchema,
  saveChecklistDraftSchema,
  submitChecklistSchema,
} from "./checklist.schemas";

const submitBase = {
  realDate: "2026-06-20",
  realTime: "08:00",
  mileage: 12345,
  fuelLevel: "TRES_QUARTOS",
  fuelCardStatus: "PRESENTE",
  internalCleanliness: "LIMPO",
  externalCleanliness: "LIMPO",
  parkingLocation: "Pátio Central",
  hasChangesFromInitial: false,
  hasDamage: false,
  items: [
    { itemKey: "para_brisas", answer: "BOM" },
    { itemKey: "farois_dianteiros", answer: "BOM" },
  ],
};

describe("submitChecklistSchema", () => {
  it("aceita um envio coerente", () => {
    const r = submitChecklistSchema.safeParse(submitBase);
    expect(r.success).toBe(true);
  });

  it("exige observação quando item está RUIM", () => {
    const r = submitChecklistSchema.safeParse({
      ...submitBase,
      items: [{ itemKey: "para_brisas", answer: "RUIM" }],
    });
    expect(r.success).toBe(false);
  });

  it("exige observação quando item está AUSENTE", () => {
    const r = submitChecklistSchema.safeParse({
      ...submitBase,
      items: [{ itemKey: "estepe", answer: "AUSENTE" }],
    });
    expect(r.success).toBe(false);
  });

  it("aceita item RUIM com observação", () => {
    const r = submitChecklistSchema.safeParse({
      ...submitBase,
      items: [{ itemKey: "para_brisas", answer: "RUIM", observation: "trinca pequena" }],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita mileage negativo", () => {
    const r = submitChecklistSchema.safeParse({ ...submitBase, mileage: -5 });
    expect(r.success).toBe(false);
  });

  it("rejeita horário fora do padrão HH:mm", () => {
    const r = submitChecklistSchema.safeParse({
      ...submitBase,
      realTime: "8:00",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita ausência de items", () => {
    const r = submitChecklistSchema.safeParse({ ...submitBase, items: [] });
    expect(r.success).toBe(false);
  });

  it("rejeita fuelLevel fora do enum", () => {
    const r = submitChecklistSchema.safeParse({
      ...submitBase,
      fuelLevel: "INVALIDO",
    });
    expect(r.success).toBe(false);
  });
});

describe("saveChecklistDraftSchema", () => {
  it("aceita corpo parcial", () => {
    const r = saveChecklistDraftSchema.safeParse({ mileage: 100 });
    expect(r.success).toBe(true);
  });
});

describe("reviewChecklistSchema", () => {
  it("aceita APPROVE", () => {
    expect(reviewChecklistSchema.safeParse({ decision: "APPROVE" }).success).toBe(true);
  });
  it("aceita REQUEST_RECTIFICATION", () => {
    expect(reviewChecklistSchema.safeParse({ decision: "REQUEST_RECTIFICATION" }).success).toBe(
      true,
    );
  });
  it("rejeita decisão arbitrária", () => {
    expect(reviewChecklistSchema.safeParse({ decision: "OUTRA" }).success).toBe(false);
  });
});
