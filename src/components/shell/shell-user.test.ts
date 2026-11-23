import { describe, it, expect } from "vitest";
import { toShellUser } from "./shell-user";

const base = {
  fullName: "Ana Paula Ribeiro",
  email: "ana@seplag.mt.gov.br",
  role: "USER" as const,
  cpf: "52998224725",
  registrationNumber: "123456",
  phone: "65999990001",
  sector: "Planejamento",
  department: "SEPLAG",
  createdAt: new Date("2026-11-13T15:00:00Z"),
};

describe("toShellUser", () => {
  it("mascara o CPF e formata telefone e data", () => {
    const u = toShellUser(base);
    expect(u.cpfMasked).toBe("***.982.247-**");
    expect(u.phone).toBe("(65) 99999-0001");
    expect(u.memberSince).toBe("13/11/2026");
    expect(JSON.stringify(u)).not.toContain("52998224725");
  });

  it("trata valores de preenchimento como não informados", () => {
    const u = toShellUser({ ...base, cpf: "00000000000", registrationNumber: "000000", phone: "" });
    expect(u.cpfMasked).toBe("");
    expect(u.registrationNumber).toBe("");
    expect(u.phone).toBe("");
  });
});
