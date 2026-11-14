export interface NavItem {
  href: string;
  label: string;
  /** Rotas "índice" exigem match exato para não acender em subrotas. */
  exact?: boolean;
}

/**
 * Navegação da área do usuário. Todo servidor pode pedir transporte; quem é
 * condutor da central vê também as viagens em que foi escalado.
 */
export function buildUserNav(opts: { isAdmin: boolean; isDriver: boolean }): NavItem[] {
  const items: NavItem[] = [
    { href: "/painel", label: "Início", exact: true },
    { href: "/solicitacoes/nova", label: "Solicitar transporte", exact: true },
    { href: "/solicitacoes", label: "Minhas solicitações" },
  ];
  if (opts.isDriver) items.push({ href: "/cautelas", label: "Minhas viagens" });
  if (opts.isAdmin) items.push({ href: "/admin", label: "Área da central", exact: true });
  return items;
}

/** Navegação da área administrativa (central). */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Painel", exact: true },
  { href: "/admin/calendario", label: "Calendário" },
  { href: "/admin/solicitacoes", label: "Solicitações" },
  { href: "/admin/cautelas", label: "Viagens" },
  { href: "/admin/veiculos", label: "Veículos" },
  { href: "/admin/condutores", label: "Condutores" },
  { href: "/admin/orgaos", label: "Órgãos" },
  { href: "/admin/avarias", label: "Avarias" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/relatorios", label: "Relatórios" },
  { href: "/painel", label: "Área do usuário", exact: true },
];
