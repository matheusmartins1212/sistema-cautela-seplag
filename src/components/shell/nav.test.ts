import { describe, it, expect } from "vitest";
import { ADMIN_NAV, USER_NAV, adminEquivalentPath } from "./nav";

describe("navegação", () => {
  it("painel admin e área do servidor não têm links um para o outro", () => {
    expect(ADMIN_NAV.some((item) => !item.href.startsWith("/admin"))).toBe(false);
    expect(USER_NAV.some((item) => item.href.startsWith("/admin"))).toBe(false);
  });
});

describe("adminEquivalentPath", () => {
  const id = "cmwfkg860000ssn7di5gvtdw7";

  it("leva solicitação e cautela para a tela equivalente do admin", () => {
    expect(adminEquivalentPath(`/solicitacoes/${id}`)).toBe(`/admin/solicitacoes/${id}`);
    expect(adminEquivalentPath(`/cautelas/${id}`)).toBe(`/admin/cautelas/${id}`);
    expect(adminEquivalentPath(`/cautelas/${id}/checklist/RETIRADA`)).toBe(`/admin/cautelas/${id}`);
  });

  it("manda o resto para o início do painel", () => {
    expect(adminEquivalentPath("/painel")).toBe("/admin");
    expect(adminEquivalentPath("/solicitacoes/nova")).toBe("/admin");
    expect(adminEquivalentPath(null)).toBe("/admin");
  });
});
