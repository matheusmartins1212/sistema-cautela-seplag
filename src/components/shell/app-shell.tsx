"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import brasao from "@/assets/brasao-mt.png";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { activeNavHref, type NavBadgeKey, type NavSection } from "./nav";
import { NavIcon } from "./nav-icons";
import type { ShellUser } from "./shell-user";

interface Props {
  brandTitle: string;
  user: ShellUser;
  /** Página "Meu perfil" da área (servidor ou admin). */
  profileHref: string;
  sections: NavSection[];
  /** Pendências mostradas ao lado dos itens que têm `badge`. */
  badges?: Partial<Record<NavBadgeKey, number>>;
  contentMaxWidth?: "5xl" | "7xl";
  children: React.ReactNode;
}

function initials(fullName: string): string {
  const parts = fullName
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

/**
 * Estrutura das telas logadas. Não há barra superior: marca, navegação e
 * usuário ficam na barra lateral. O bloco do usuário, no rodapé, leva à página
 * "Meu perfil", onde ficam os dados da conta e a opção de sair.
 * No celular, uma faixa mínima no topo só abre o menu e mostra as notificações.
 */
export function AppShell({
  brandTitle,
  user,
  profileHref,
  sections,
  badges = {},
  contentMaxWidth = "7xl",
  children,
}: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fecha o menu do celular ao trocar de página (inclusive pelo botão voltar).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Com o menu aberto: Esc fecha e a página de fundo não rola.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  const brand = (
    <div className="relative px-5 pb-5 pt-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
          <Image src={brasao} alt="Brasão do Estado de Mato Grosso" className="h-9 w-auto" />
        </span>
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-institutional-300">
            SEPLAG · SATGF
          </p>
          <p className="mt-0.5 text-[15px] font-semibold leading-snug text-white">{brandTitle}</p>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
    </div>
  );

  const nav = sections.flatMap((section) => section.items);
  const activeHref = activeNavHref(pathname, nav);
  const navList = (
    <nav aria-label="Navegação principal" className="px-3 py-4">
      {sections.map((section, i) => (
        <div key={section.title ?? `secao-${i}`} className={cn(i > 0 && "mt-5")}>
          {section.title && (
            <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-institutional-300/70">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = item.href === activeHref;
              const count = item.badge ? (badges[item.badge] ?? 0) : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      "outline-none focus-visible:ring-2 focus-visible:ring-institutional-300",
                      active
                        ? "bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "text-institutional-100/85 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-institutional-300"
                      />
                    )}
                    {item.icon && (
                      <NavIcon
                        name={item.icon}
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          active
                            ? "text-institutional-200"
                            : "text-institutional-300/70 group-hover:text-institutional-200",
                        )}
                      />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 && (
                      <span
                        className="min-w-[1.375rem] rounded-full bg-amber-400 px-1.5 py-px text-center text-[11px] font-bold tabular-nums text-institutional-950"
                        title={`${count} pendente${count === 1 ? "" : "s"}`}
                      >
                        {count > 99 ? "99+" : count}
                        <span className="sr-only"> pendente{count === 1 ? "" : "s"}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  // Rodapé da barra lateral: atalho para a página "Meu perfil" e notificações.
  const profileActive = pathname === profileHref;
  const userPanel = (inDrawer: boolean) => (
    <div className="relative p-3">
      <div
        aria-hidden="true"
        className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      <div
        className={cn(
          "flex items-center gap-1 rounded-xl p-1.5 ring-1 transition-colors",
          profileActive ? "bg-white/[0.1] ring-white/15" : "bg-white/[0.04] ring-white/[0.08]",
        )}
      >
        <Link
          href={profileHref}
          onClick={() => setDrawerOpen(false)}
          aria-current={profileActive ? "page" : undefined}
          aria-label={`Meu perfil: ${user.fullName}`}
          className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-institutional-300"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-institutional-400 to-institutional-700 text-[13px] font-semibold text-white ring-2 ring-white/15"
          >
            {initials(user.fullName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 break-words text-sm font-medium leading-tight text-white">
              {user.fullName}
            </span>
            <span className="mt-0.5 block truncate text-xs text-institutional-300">
              {user.roleLabel}
            </span>
          </span>
        </Link>
        {!inDrawer && <NotificationBell placement="sidebar" />}
      </div>
    </div>
  );

  const sidebarSurface =
    "bg-gradient-to-b from-institutional-950 via-institutional-900 to-institutional-950";
  // Marca d'água recortada no próprio contêiner: a barra não pode cortar o
  // painel de notificações, que abre para fora dela.
  const watermark = (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <Image
        src={brasao}
        alt=""
        className="absolute -right-16 bottom-16 h-64 w-auto select-none opacity-[0.03]"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Barra lateral no computador: fica fixa enquanto a página rola. Só a
          lista de links rola, para o rodapé do usuário ficar sempre visível e o
          painel de notificações poder abrir para fora da barra. */}
      <aside
        className={cn(
          "relative hidden w-64 shrink-0 flex-col border-r border-black/20 lg:sticky lg:top-0 lg:z-30 lg:flex lg:h-screen lg:self-start",
          sidebarSurface,
        )}
      >
        {watermark}
        {brand}
        <div className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
          {navList}
        </div>
        {userPanel(false)}
      </aside>

      {/* Faixa mínima no celular: abrir menu e notificações */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-r from-institutional-950 to-institutional-900 px-3 py-2 text-white shadow-sm lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={drawerOpen}
            className="rounded-lg p-2 hover:bg-white/10"
          >
            <MenuIcon />
          </button>
          <Image src={brasao} alt="" aria-hidden="true" className="h-7 w-auto" />
          <span className="truncate text-sm font-semibold">{brandTitle}</span>
        </div>
        <NotificationBell placement="topbar" />
      </div>

      {/* Menu no celular */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div
            className="absolute inset-0 bg-institutional-950/50 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={cn(
              "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-hidden shadow-2xl",
              sidebarSurface,
            )}
          >
            {watermark}
            {brand}
            <div className="relative min-h-0 flex-1 overflow-y-auto">{navList}</div>
            {userPanel(true)}
          </aside>
        </div>
      )}

      <main
        className={cn(
          "mx-auto w-full min-w-0 flex-1 px-4 py-8 lg:px-8",
          contentMaxWidth === "5xl" ? "max-w-5xl" : "max-w-7xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
