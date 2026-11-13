"use client";

import { useState } from "react";
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
  user: { fullName: string; roleLabel: string };
  nav: NavItem[];
  contentMaxWidth?: "5xl" | "7xl";
  children: React.ReactNode;
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppShell({ brandTitle, user, nav, contentMaxWidth = "7xl", children }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navList = (
    <nav className="flex flex-col gap-1 p-3">
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

  const brand = (
    <div className="flex items-center gap-3 border-b border-institutional-700/50 px-5 py-4">
      <Image src={brasao} alt="Brasão do Estado de Mato Grosso" className="h-11 w-auto shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-institutional-200">SEPLAG / SATGF</p>
        <p className="text-base font-semibold leading-tight text-white">{brandTitle}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Sidebar — desktop */}
      <aside className="hidden w-64 shrink-0 flex-col bg-institutional-900 lg:flex">
        {brand}
        {navList}
      </aside>

      {/* Drawer — mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-institutional-900 shadow-xl">
            {brand}
            {navList}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-200 bg-institutional-800 px-4 py-3 text-white lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
              className="rounded-md p-2 hover:bg-institutional-700 lg:hidden"
            >
              <MenuIcon />
            </button>
            <Image src={brasao} alt="" aria-hidden="true" className="h-7 w-auto lg:hidden" />
            <span className="text-sm font-semibold lg:hidden">{brandTitle}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.fullName}</p>
              <p className="text-xs text-institutional-100">{user.roleLabel}</p>
            </div>
            <NotificationBell />
            <LogoutButton />
          </div>
        </header>

        <main
          className={cn(
            "mx-auto w-full px-4 py-8 lg:px-6",
            contentMaxWidth === "5xl" ? "max-w-5xl" : "max-w-7xl",
          )}
        >
          {children}
        </main>
      </div>
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
