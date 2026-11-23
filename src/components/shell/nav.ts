export interface NavItem {
  href: string;
  label: string;
  /** Rotas "índice" exigem match exato para não acender em subrotas. */
  exact?: boolean;
  /** Outras rotas que pertencem a este item (ex.: checklist pertence a Cautelas). */
  alsoMatches?: string[];
}

/**
 * Qual item do menu fica aceso para a página atual. Sempre no máximo um:
 * entre os itens que casam com o caminho, vence o mais específico (o prefixo
 * mais longo). Assim "/solicitacoes/nova" acende só "Solicitar veículo", e
 * não também "Minhas solicitações", que casa com "/solicitacoes/...".
 */
export function activeNavHref(pathname: string, items: readonly NavItem[]): string | null {
  let best: { href: string; length: number } | null = null;
  for (const item of items) {
    const candidates = item.exact ? [] : (item.alsoMatches ?? []);
    const matchesSelf = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matchesSelf && (!best || item.href.length > best.length)) {
      best = { href: item.href, length: item.href.length };
    }
    for (const prefix of candidates) {
      const hit = pathname === prefix || pathname.startsWith(`${prefix}/`);
      if (hit && (!best || prefix.length > best.length)) {
        best = { href: item.href, length: prefix.length };
      }
    }
  }
  return best?.href ?? null;
}

/** Navegação da área do servidor (perfil de usuário). */
export const USER_NAV: NavItem[] = [
  { href: "/painel", label: "Início", exact: true },
  { href: "/solicitacoes/nova", label: "Solicitar veículo", exact: true },
  { href: "/solicitacoes", label: "Minhas solicitações" },
  { href: "/cautelas", label: "Minhas cautelas" },
];

/** Navegação da área administrativa. */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Painel", exact: true },
  { href: "/admin/calendario", label: "Calendário" },
  { href: "/admin/solicitacoes", label: "Solicitações" },
  { href: "/admin/cautelas", label: "Cautelas", alsoMatches: ["/admin/checklists"] },
  { href: "/admin/veiculos", label: "Veículos" },
  { href: "/admin/avarias", label: "Avarias" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/relatorios", label: "Relatórios" },
];

/**
 * Para onde mandar um administrador que abriu uma tela da área do servidor.
 * Links de solicitação e cautela vão para a tela equivalente do painel
 * administrativo; o resto vai para o início do painel.
 */
export function adminEquivalentPath(pathname: string | null): string {
  if (!pathname) return "/admin";
  if (pathname === "/perfil" || pathname.startsWith("/perfil/")) return "/admin/perfil";
  const request = /^\/solicitacoes\/(c[a-z0-9]{20,})\/?$/.exec(pathname);
  if (request) return `/admin/solicitacoes/${request[1]}`;
  const caution = /^\/cautelas\/(c[a-z0-9]{20,})(?:\/.*)?$/.exec(pathname);
  if (caution) return `/admin/cautelas/${caution[1]}`;
  return "/admin";
}
