"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import brasao from "@/assets/brasao-mt.png";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NavItem } from "./nav";

interface Props {
  brandTitle: string;
  user: { fullName: string; email: string; roleLabel: string };
  nav: NavItem[];
  contentMaxWidth?: "5xl" | "7xl";
  children: React.ReactNode;
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
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
 * usuário (nome, perfil, notificações e sair) ficam todos na barra lateral.
 * No celular, uma faixa mínima no topo só abre o menu e mostra as notificações.
 */
export function AppShell({ brandTitle, user, nav, contentMaxWidth = "7xl", children }: Props) {
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

  const navList = (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1 p-3">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setDrawerOpen(false)}
          aria-current={isActive(pathname, item) ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(pathname, item)
              ? "bg-institutional-700 text-white"
              : "text-institutional-100 hover:bg-institutional-800/60 hover:text-white",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  // Rodapé da barra lateral: perfil (abre o menu da conta) e notificações.
  const userPanel = (withBell: boolean) => (
    <div className="flex items-center border-t border-institutional-700/50 px-2 py-3">
      <UserMenu user={user} />
      {withBell && <NotificationBell placement="sidebar" />}
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
        {userPanel(true)}
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
            {userPanel(false)}
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

/**
 * Bloco do perfil no rodapé da barra lateral. Ao clicar, abre para cima um
 * menu com os dados da conta e a opção de sair.
 */
function UserMenu({ user }: { user: Props["user"] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    // Teclado: o foco vai para a opção do menu ao abrir.
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Perfil: ${user.fullName}`}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-1.5 py-2 text-left transition-colors hover:bg-institutional-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-institutional-300",
          open && "bg-institutional-800/60",
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-institutional-700 text-sm font-semibold text-white"
        >
          {initials(user.fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 break-words text-sm font-medium leading-tight text-white">
            {user.fullName}
          </span>
          <span className="block truncate text-xs text-institutional-200">{user.roleLabel}</span>
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Conta"
          className="absolute bottom-full left-0 z-50 mb-2 w-60 overflow-hidden rounded-card border border-gray-200 bg-white text-gray-900 shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
            <p className="truncate text-xs text-gray-500" title={user.email}>
              {user.email}
            </p>
          </div>
          <div className="p-1">
            <LogoutButton appearance="menuitem" />
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(
        "shrink-0 text-institutional-200 transition-transform",
        open ? "rotate-0" : "rotate-180",
      )}
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
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
