export interface NavItem {
  href: string;
  label: string;
  /** Rotas "índice" exigem match exato para não acender em subrotas. */
  exact?: boolean;
}

/** Navegação da área do usuário comum. */
export function buildUserNav(isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: "/painel", label: "Início", exact: true },
    { href: "/solicitacoes/nova", label: "Solicitar veículo", exact: true },
    { href: "/solicitacoes", label: "Minhas solicitações" },
    { href: "/cautelas", label: "Minhas cautelas" },
  ];
  if (isAdmin) items.push({ href: "/admin", label: "Área administrativa", exact: true });
  return items;
}

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
  { href: "/painel", label: "Área do usuário", exact: true },
];
