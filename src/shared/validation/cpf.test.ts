import { describe, it, expect } from "vitest";
import { normalizeCpf, maskCpf, formatCpf, isValidCpf } from "./cpf";

describe("normalizeCpf", () => {
  it("remove pontuação", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
  });
});

describe("isValidCpf", () => {
  it("aceita CPF válido", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejeita dígitos verificadores incorretos", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false);
  });

  it("rejeita sequência repetida", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });

  it("rejeita tamanho inválido", () => {
    expect(isValidCpf("123")).toBe(false);
  });
});

describe("maskCpf / formatCpf", () => {
  it("mascara para exibição não administrativa", () => {
    expect(maskCpf("52998224725")).toBe("***.982.247-**");
  });

  it("formata completo para uso administrativo", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
  });
});
