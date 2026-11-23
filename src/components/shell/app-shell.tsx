"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import brasao from "@/assets/brasao-mt.png";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { activeNavHref, type NavItem } from "./nav";
import type { ShellUser } from "./shell-user";

interface Props {
  brandTitle: string;
  user: ShellUser;
  /** Página "Meu perfil" da área (servidor ou admin). */
  profileHref: string;
  nav: NavItem[];
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
  nav,
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
    <div className="flex items-center gap-3 border-b border-institutional-700/50 px-5 py-4">
      <Image src={brasao} alt="Brasão do Estado de Mato Grosso" className="h-11 w-auto shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-institutional-200">SEPLAG / SATGF</p>
        <p className="text-base font-semibold leading-tight text-white">{brandTitle}</p>
      </div>
    </div>
  );

  const activeHref = activeNavHref(pathname, nav);
  const navList = (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1 p-3">
      {nav.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setDrawerOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-institutional-700 text-white"
                : "text-institutional-100 hover:bg-institutional-800/60 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  // Rodapé da barra lateral: atalho para a página "Meu perfil" e notificações.
  const profileActive = pathname === profileHref;
  const userPanel = (inDrawer: boolean) => (
    <div className="flex items-center border-t border-institutional-700/50 px-2 py-3">
      <Link
        href={profileHref}
        onClick={() => setDrawerOpen(false)}
        aria-current={profileActive ? "page" : undefined}
        aria-label={`Meu perfil: ${user.fullName}`}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-institutional-300",
          profileActive ? "bg-institutional-700" : "hover:bg-institutional-800/60",
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-institutional-700 text-sm font-semibold text-white ring-1 ring-white/10"
        >
          {initials(user.fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 break-words text-sm font-medium leading-tight text-white">
            {user.fullName}
          </span>
          <span className="block truncate text-xs text-institutional-200">{user.roleLabel}</span>
        </span>
      </Link>
      {!inDrawer && <NotificationBell placement="sidebar" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Barra lateral no computador: fica fixa enquanto a página rola. Só a
          lista de links rola, para o rodapé do usuário ficar sempre visível e o
          painel de notificações poder abrir para fora da barra. */}
      <aside className="hidden w-64 shrink-0 flex-col bg-institutional-900 lg:sticky lg:top-0 lg:z-30 lg:flex lg:h-screen lg:self-start">
        {brand}
        <div className="min-h-0 flex-1 overflow-y-auto">{navList}</div>
        {userPanel(false)}
      </aside>

      {/* Faixa mínima no celular: abrir menu e notificações */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-institutional-900 px-3 py-2 text-white lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={drawerOpen}
            className="rounded-md p-2 hover:bg-institutional-700"
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
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-institutional-900 shadow-xl">
            {brand}
            <div className="min-h-0 flex-1 overflow-y-auto">{navList}</div>
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
