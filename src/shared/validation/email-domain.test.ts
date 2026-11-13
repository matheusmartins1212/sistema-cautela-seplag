import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  isValidEmailFormat,
  getEmailDomain,
  isAllowedInstitutionalEmail,
} from "./email-domain";

const DOMAIN = "seplag.mt.gov.br";
const ZWSP = String.fromCharCode(0x200b); // zero-width space
const BOM = String.fromCharCode(0xfeff); // byte order mark / zero-width no-break
const NBSP = String.fromCharCode(0x00a0); // non-breaking space

describe("normalizeEmail", () => {
  it("faz trim e lowercase", () => {
    expect(normalizeEmail("  Joao.Silva@SEPLAG.MT.GOV.BR  ")).toBe("joao.silva@seplag.mt.gov.br");
  });

  it("remove caracteres invisíveis (zero-width, NBSP, BOM)", () => {
    const sneaky = `${NBSP}joao${ZWSP}.silva@seplag.mt.gov.br${BOM}`;
    expect(normalizeEmail(sneaky)).toBe("joao.silva@seplag.mt.gov.br");
  });
});

describe("isAllowedInstitutionalEmail", () => {
  it("aceita e-mail institucional válido", () => {
    expect(isAllowedInstitutionalEmail("joao.silva@seplag.mt.gov.br", DOMAIN)).toBe(true);
  });

  it("aceita após normalização de caixa e espaços", () => {
    expect(isAllowedInstitutionalEmail("  Joao@SEPLAG.MT.GOV.BR ", DOMAIN)).toBe(true);
  });

  it("rejeita subdomínio falso (sufixo)", () => {
    expect(isAllowedInstitutionalEmail("usuario@seplag.mt.gov.br.fake.com", DOMAIN)).toBe(false);
  });

  it("rejeita duplo arroba", () => {
    expect(isAllowedInstitutionalEmail("usuario@seplag.mt.gov.br@gmail.com", DOMAIN)).toBe(false);
  });

  it("rejeita domínio diferente", () => {
    expect(isAllowedInstitutionalEmail("usuario@gmail.com", DOMAIN)).toBe(false);
  });

  it("rejeita injeção de caractere invisível no domínio", () => {
    expect(isAllowedInstitutionalEmail(`usuario@seplag.mt.gov.br${ZWSP}.evil.com`, DOMAIN)).toBe(
      false,
    );
  });
});

describe("getEmailDomain / isValidEmailFormat", () => {
  it("extrai o domínio", () => {
    expect(getEmailDomain("a@b.com")).toBe("b.com");
  });

  it("retorna null com múltiplos @", () => {
    expect(getEmailDomain("a@b@c.com")).toBeNull();
  });

  it("rejeita formato sem domínio com ponto", () => {
    expect(isValidEmailFormat("a@localhost")).toBe(false);
  });
});
