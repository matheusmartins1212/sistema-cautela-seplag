/** Ícones disponíveis no menu (desenhados em nav-icons.tsx). */
export type NavIconName =
  | "dashboard"
  | "home"
  | "calendar"
  | "inbox"
  | "route"
  | "alert"
  | "car"
  | "steering"
  | "building"
  | "users"
  | "chart"
  | "plus";

export interface NavItem {
  href: string;
  label: string;
  icon?: NavIconName;
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

export interface NavSection {
  /** Título da seção; a primeira costuma não ter. */
  title?: string;
  items: NavItem[];
}

/**
 * Navegação da área do usuário. Todo servidor pode pedir veículo, com ou sem
 * condutor. "Minhas viagens" reúne as viagens em que a pessoa está com o
 * veículo: as que ela mesma dirige e as que foi escalada como condutora.
 */
export const USER_NAV_SECTIONS: NavSection[] = [
  { items: [{ href: "/painel", label: "Início", exact: true, icon: "home" }] },
  {
    title: "Transporte",
    items: [
      { href: "/solicitacoes/nova", label: "Solicitar veículo", exact: true, icon: "plus" },
      { href: "/solicitacoes", label: "Minhas solicitações", icon: "inbox" },
      { href: "/cautelas", label: "Minhas viagens", icon: "route" },
    ],
  },
];

/** Navegação da área administrativa (central). */
export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Painel", exact: true, icon: "dashboard" },
      { href: "/admin/calendario", label: "Calendário", icon: "calendar" },
    ],
  },
  {
    title: "Operação",
    items: [
      {
        href: "/admin/solicitacoes",
        label: "Solicitações",
        icon: "inbox",
      },
      {
        href: "/admin/cautelas",
        label: "Viagens",
        icon: "route",
        alsoMatches: ["/admin/checklists"],
      },
      { href: "/admin/avarias", label: "Avarias", icon: "alert" },
    ],
  },
  {
    title: "Frota",
    items: [
      { href: "/admin/veiculos", label: "Veículos", icon: "car" },
      { href: "/admin/condutores", label: "Condutores", icon: "steering" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/admin/orgaos", label: "Órgãos", icon: "building" },
      { href: "/admin/usuarios", label: "Usuários", icon: "users" },
      { href: "/admin/relatorios", label: "Relatórios", icon: "chart" },
    ],
  },
];

/** Listas planas (para destacar o item ativo e para os testes). */
export const USER_NAV: NavItem[] = USER_NAV_SECTIONS.flatMap((s) => s.items);
export const ADMIN_NAV: NavItem[] = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);

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
