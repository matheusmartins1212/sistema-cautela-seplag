import { describe, it, expect } from "vitest";
import { toProfileView } from "./profile-view";

const base = {
  fullName: "Ana Paula Ribeiro",
  email: "ana@seplag.mt.gov.br",
  role: "USER" as const,
  status: "ACTIVE" as const,
  emailVerifiedAt: new Date("2026-11-13T15:05:00Z"),
  mustChangePassword: false,
  passwordResetRequestedAt: null,
  cpf: "52998224725",
  registrationNumber: "123456",
  phone: "65999990001",
  sector: "Planejamento",
  department: "SEPLAG",
  createdAt: new Date("2026-11-13T15:00:00Z"),
};

describe("toProfileView", () => {
  it("mascara o CPF e formata telefone e data", () => {
    const u = toProfileView(base);
    expect(u.cpfMasked).toBe("***.982.247-**");
    expect(u.phone).toBe("(65) 99999-0001");
    expect(u.memberSince).toBe("13/11/2026");
    expect(u.emailVerifiedOn).toBe("13/11/2026");
    expect(JSON.stringify(u)).not.toContain("52998224725");
  });

  it("trata valores de preenchimento como não informados", () => {
    const u = toProfileView({
      ...base,
      cpf: "00000000000",
      registrationNumber: "000000",
      phone: "",
    });
    expect(u.cpfMasked).toBe("");
    expect(u.registrationNumber).toBe("");
    expect(u.phone).toBe("");
  });
});
