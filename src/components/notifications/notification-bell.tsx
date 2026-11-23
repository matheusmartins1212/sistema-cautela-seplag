"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api-client";
import { cn } from "@/lib/cn";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  href: string | null;
  createdAt: string;
}

interface NotificationsPayload {
  items: NotificationItem[];
  total: number;
  unread: number;
}

const POLL_INTERVAL_MS = 60_000;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * "sidebar": sino no rodapé da barra lateral; o painel abre para a direita,
 * ao lado da barra, alinhado por baixo. "topbar": faixa do celular; o painel
 * desce alinhado à direita.
 */
export function NotificationBell({ placement = "topbar" }: { placement?: "sidebar" | "topbar" }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await apiGet<NotificationsPayload>("/api/notifications?limit=20");
    if (res.ok) {
      setItems(res.data.items);
      setUnread(res.data.unread);
    }
  }, []);

  // Carga inicial + polling leve.
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Fecha ao clicar fora ou com Esc.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onItemClick(item: NotificationItem) {
    if (!item.read) {
      // Atualização otimista do contador; a fonte de verdade é o backend.
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
      await apiPost(`/api/notifications/${item.id}/read`);
    }
    if (item.href) {
      setOpen(false);
      router.push(item.href);
    }
  }

  async function onMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await apiPost("/api/notifications/read-all");
    void load();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative rounded-md p-2 text-institutional-50 hover:bg-institutional-700 focus:outline-none focus:ring-2 focus:ring-institutional-300"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.1rem] items-center justify-center rounded-full bg-danger px-1 text-[0.65rem] font-bold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 overflow-hidden rounded-card border border-gray-200 bg-white text-gray-900 shadow-lg",
            placement === "sidebar"
              ? "bottom-0 left-full ml-8 w-96"
              : "right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))]",
          )}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold">Notificações</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={onMarkAll}
                className="text-xs font-medium text-institutional-700 hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Nenhuma notificação.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(item)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-gray-50",
                        !item.read && "bg-institutional-50/60",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {!item.read && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-institutional-600"
                            aria-hidden="true"
                          />
                        )}
                        <span className="text-sm font-medium text-gray-900">{item.title}</span>
                      </span>
                      <span className="text-xs text-gray-600">{item.message}</span>
                      <span className="text-[0.7rem] text-gray-400">
                        {relativeTime(item.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
