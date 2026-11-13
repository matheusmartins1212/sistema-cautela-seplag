import { describe, it, expect } from "vitest";
import { buildEmailConfirmation, buildPasswordReset } from "./auth-templates";

describe("templates de e-mail", () => {
  it("confirmação inclui assunto, html, texto e o link de ação", () => {
    const url = "http://localhost:3000/verificar-email?token=RAW";
    const msg = buildEmailConfirmation({
      to: "joao@seplag.mt.gov.br",
      fullName: "João",
      confirmationUrl: url,
      expiresInLabel: "24 horas",
    });
    expect(msg.template).toBe("EMAIL_CONFIRMATION");
    expect(msg.subject).toContain("Confirmação de cadastro");
    expect(msg.html).toContain(url);
    expect(msg.text).toContain(url); // fallback texto obrigatório
    expect(msg.text.length).toBeGreaterThan(0);
  });

  it("reset inclui link e menção de uso único", () => {
    const url = "http://localhost:3000/redefinir-senha?token=RAW";
    const msg = buildPasswordReset({
      to: "maria@seplag.mt.gov.br",
      fullName: "Maria",
      resetUrl: url,
      expiresInLabel: "30 minutos",
    });
    expect(msg.template).toBe("PASSWORD_RESET");
    expect(msg.html).toContain(url);
    expect(msg.text).toContain("30 minutos");
  });

  it("escapa HTML do nome (anti-injeção)", () => {
    const msg = buildEmailConfirmation({
      to: "x@seplag.mt.gov.br",
      fullName: "<script>alert(1)</script>",
      confirmationUrl: "http://localhost:3000/x",
      expiresInLabel: "24 horas",
    });
    expect(msg.html).not.toContain("<script>alert(1)</script>");
    expect(msg.html).toContain("&lt;script&gt;");
  });
});
