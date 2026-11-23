import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ADMIN_NAV, USER_NAV, activeNavHref, adminEquivalentPath, type NavItem } from "./nav";

/** Todas as páginas reais do app, com os segmentos dinâmicos preenchidos. */
function pageRoutes(): string[] {
  const appDir = path.resolve(__dirname, "../../app");
  const routes: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx") {
        const rel = path.relative(appDir, dir).split(path.sep).filter(Boolean);
        const segments = rel
          .filter((seg) => !/^\(.*\)$/.test(seg)) // grupos de rota não entram na URL
          .map((seg) =>
            seg === "[type]"
              ? "RETIRADA"
              : /^\[.*\]$/.test(seg)
                ? "cmwfkg860000ssn7di5gvtdw7"
                : seg,
          );
        routes.push(`/${segments.join("/")}`);
      }
    }
  };
  walk(appDir);
  return routes;
}

function highlighted(pathname: string, items: NavItem[]): string[] {
  const href = activeNavHref(pathname, items);
  return items.filter((item) => item.href === href).map((item) => item.label);
}

describe("item aceso no menu", () => {
  const routes = pageRoutes();
  const userRoutes = routes.filter((r) => /^\/(painel|solicitacoes|cautelas)(\/|$)/.test(r));
  const adminRoutes = routes.filter((r) => /^\/admin(\/|$)/.test(r));

  it("encontra as páginas das duas áreas", () => {
    expect(userRoutes.length).toBeGreaterThan(5);
    expect(adminRoutes.length).toBeGreaterThan(10);
  });

  it.each(userRoutes.map((r) => [r]))("área do servidor %s acende exatamente um item", (route) => {
    expect(highlighted(route, USER_NAV)).toHaveLength(1);
  });

  it.each(adminRoutes.map((r) => [r]))("painel admin %s acende exatamente um item", (route) => {
    expect(highlighted(route, ADMIN_NAV)).toHaveLength(1);
  });

  it("acende o item certo nos casos que se sobrepõem", () => {
    expect(highlighted("/solicitacoes/nova", USER_NAV)).toEqual(["Solicitar veículo"]);
    expect(highlighted("/solicitacoes", USER_NAV)).toEqual(["Minhas solicitações"]);
    expect(highlighted("/solicitacoes/cmwfkg860000ssn7di5gvtdw7", USER_NAV)).toEqual([
      "Minhas solicitações",
    ]);
    expect(highlighted("/admin/checklists/cmwfkg860000ssn7di5gvtdw7", ADMIN_NAV)).toEqual([
      "Cautelas",
    ]);
    expect(highlighted("/admin/veiculos/novo", ADMIN_NAV)).toEqual(["Veículos"]);
    expect(highlighted("/admin", ADMIN_NAV)).toEqual(["Painel"]);
  });
});

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
