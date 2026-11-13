import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, resetPasswordSchema } from "./auth.schemas";

const validRegister = {
  fullName: "João da Silva",
  cpf: "529.982.247-25",
  registrationNumber: "12345",
  email: "Joao.Silva@SEPLAG.MT.GOV.BR",
  phone: "(65) 99999-0000",
  sector: "Gestão de Frota",
  department: "Gestão de Frota",
  password: "Sutran@2026!",
  confirmPassword: "Sutran@2026!",
};

describe("registerSchema", () => {
  it("aceita cadastro válido e normaliza e-mail/CPF", () => {
    const parsed = registerSchema.parse(validRegister);
    expect(parsed.email).toBe("joao.silva@seplag.mt.gov.br");
    expect(parsed.cpf).toBe("52998224725");
  });

  it("rejeita e-mail fora do domínio institucional", () => {
    expect(() => registerSchema.parse({ ...validRegister, email: "joao@gmail.com" })).toThrow();
  });

  it("rejeita spoofing de subdomínio", () => {
    expect(() =>
      registerSchema.parse({
        ...validRegister,
        email: "joao@seplag.mt.gov.br.fake.com",
      }),
    ).toThrow();
  });

  it("rejeita CPF inválido", () => {
    expect(() => registerSchema.parse({ ...validRegister, cpf: "111.111.111-11" })).toThrow();
  });

  it("rejeita senha fraca", () => {
    expect(() =>
      registerSchema.parse({
        ...validRegister,
        password: "fraca",
        confirmPassword: "fraca",
      }),
    ).toThrow();
  });

  it("rejeita confirmação de senha divergente", () => {
    expect(() =>
      registerSchema.parse({ ...validRegister, confirmPassword: "Outra@2026!" }),
    ).toThrow();
  });
});

describe("loginSchema", () => {
  it("normaliza o e-mail", () => {
    const parsed = loginSchema.parse({ email: "  X@SEPLAG.MT.GOV.BR ", password: "x" });
    expect(parsed.email).toBe("x@seplag.mt.gov.br");
  });
});

describe("resetPasswordSchema", () => {
  it("exige token e senha forte com confirmação", () => {
    expect(() =>
      resetPasswordSchema.parse({
        token: "t",
        password: "Sutran@2026!",
        confirmPassword: "Sutran@2026!",
      }),
    ).not.toThrow();
    expect(() =>
      resetPasswordSchema.parse({
        token: "",
        password: "Sutran@2026!",
        confirmPassword: "Sutran@2026!",
      }),
    ).toThrow();
  });
});
