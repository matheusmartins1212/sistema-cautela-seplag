export interface NavItem {
  href: string;
  label: string;
  /** Rotas "índice" exigem match exato para não acender em subrotas. */
  exact?: boolean;
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
  { href: "/admin/cautelas", label: "Cautelas" },
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
  const request = /^\/solicitacoes\/(c[a-z0-9]{20,})\/?$/.exec(pathname);
  if (request) return `/admin/solicitacoes/${request[1]}`;
  const caution = /^\/cautelas\/(c[a-z0-9]{20,})(?:\/.*)?$/.exec(pathname);
  if (caution) return `/admin/cautelas/${caution[1]}`;
  return "/admin";
}
